import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * GET /api/messages?conversationId=xxx&page=1&limit=50
 * Fetch messages for a conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const token = await getCmsToken();
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    };

    // Verify user is participant of this conversation
    const convRes = await fetch(
      `${CMS_URL}/api/conversations/${conversationId}?depth=0`,
      { headers: authHeaders }
    );

    if (!convRes.ok) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = await convRes.json();
    const isParticipant = conv.participants?.some(
      (p: any) => (typeof p.user === 'string' ? p.user : p.user?.id) === session.user.id
    );
    const isAdmin = ['admin', 'owner'].includes((session.user as any).role);

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch messages
    const cmsParams = new URLSearchParams();
    cmsParams.append('where[conversation][equals]', conversationId);
    cmsParams.append('sort', '-createdAt');
    cmsParams.append('depth', '1');
    cmsParams.append('page', page);
    cmsParams.append('limit', limit);

    const msgRes = await fetch(`${CMS_URL}/api/messages?${cmsParams.toString()}`, {
      headers: authHeaders,
    });

    if (!msgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: msgRes.status });
    }

    const data = await msgRes.json();

    // Filter out messages soft-deleted by this user
    if (data.docs) {
      data.docs = data.docs.filter((msg: any) => {
        if (!msg.deletedFor) return true;
        return !msg.deletedFor.some(
          (d: any) => (typeof d.user === 'string' ? d.user : d.user?.id) === session.user.id
        );
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Messages GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/messages
 * Send a message. Body: { conversationId, body }
 * Or start a new conversation: { recipientId, body }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reqBody = await request.json();
    const { conversationId, recipientId, body } = reqBody;

    if (!body?.trim()) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 });
    }
    if (body.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 });
    }

    const token = await getCmsToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    };

    let targetConversationId = conversationId;

    // If no conversationId, find or create a conversation with recipientId
    if (!targetConversationId && recipientId) {
      if (recipientId === session.user.id) {
        return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
      }

      // Check if blocked
      const blockRes = await fetch(
        `${CMS_URL}/api/user-blocks?where[blocker][equals]=${recipientId}&where[blocked][equals]=${session.user.id}&limit=1`,
        { headers }
      );
      if (blockRes.ok) {
        const blockData = await blockRes.json();
        if (blockData.docs?.length > 0) {
          return NextResponse.json({ error: 'You cannot message this user' }, { status: 403 });
        }
      }

      // Check if recipient allows messages
      const recipientRes = await fetch(
        `${CMS_URL}/api/users/${recipientId}?depth=0`,
        { headers }
      );
      if (recipientRes.ok) {
        const recipient = await recipientRes.json();
        if (recipient.allowMessages === 'nobody') {
          return NextResponse.json({ error: 'This user does not accept messages' }, { status: 403 });
        }
      }

      // Find existing conversation between these two users
      // We search for conversations where both users are participants
      const searchRes = await fetch(
        `${CMS_URL}/api/conversations?where[participants.user][equals]=${session.user.id}&depth=0&limit=100`,
        { headers }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const existing = searchData.docs?.find((conv: any) =>
          conv.participants?.some(
            (p: any) => (typeof p.user === 'string' ? p.user : p.user?.id) === recipientId
          )
        );
        if (existing) {
          targetConversationId = existing.id;
        }
      }

      // Create new conversation if none exists
      if (!targetConversationId) {
        const createConvRes = await fetch(`${CMS_URL}/api/conversations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            participants: [
              { user: session.user.id },
              { user: recipientId },
            ],
            lastMessageAt: new Date().toISOString(),
            lastMessagePreview: body.trim().substring(0, 100),
          }),
        });

        if (!createConvRes.ok) {
          const err = await createConvRes.text();
          return NextResponse.json({ error: 'Failed to create conversation', details: err }, { status: 500 });
        }

        const newConv = await createConvRes.json();
        targetConversationId = newConv.doc?.id || newConv.id;
      }
    }

    if (!targetConversationId) {
      return NextResponse.json({ error: 'conversationId or recipientId required' }, { status: 400 });
    }

    // Create the message
    const createMsgRes = await fetch(`${CMS_URL}/api/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversation: targetConversationId,
        sender: session.user.id,
        body: body.trim(),
      }),
    });

    if (!createMsgRes.ok) {
      const err = await createMsgRes.text();
      return NextResponse.json({ error: 'Failed to send message', details: err }, { status: 500 });
    }

    const newMsg = await createMsgRes.json();

    // Update conversation's lastMessageAt and preview
    await fetch(`${CMS_URL}/api/conversations/${targetConversationId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: body.trim().substring(0, 100),
      }),
    }).catch(() => {}); // Non-critical

    // Send notification to the recipient
    const senderName = (session.user as any).username || session.user.name || 'Someone';
    // Determine recipient: the other participant in the conversation
    const notifyRecipientId = recipientId || null;
    if (token && notifyRecipientId && notifyRecipientId !== session.user.id) {
      fetch(`${CMS_URL}/api/notifications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipient: notifyRecipientId,
          type: 'new_message',
          title: `${senderName} sent you a message`,
          body: body.trim().substring(0, 200),
          linkUrl: '/messages',
          fromUser: session.user.id,
        }),
      }).catch(() => {}); // Non-blocking
    } else if (token && targetConversationId && !recipientId) {
      // Existing conversation — look up the other participant
      try {
        const convLookup = await fetch(
          `${CMS_URL}/api/conversations/${targetConversationId}?depth=0`,
          { headers }
        );
        if (convLookup.ok) {
          const convData = await convLookup.json();
          const otherParticipant = convData.participants?.find(
            (p: any) => {
              const uid = typeof p.user === 'string' ? p.user : p.user?.id;
              return uid !== session.user.id;
            }
          );
          const otherId = typeof otherParticipant?.user === 'string'
            ? otherParticipant.user
            : otherParticipant?.user?.id;
          if (otherId) {
            fetch(`${CMS_URL}/api/notifications`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                recipient: otherId,
                type: 'new_message',
                title: `${senderName} sent you a message`,
                body: body.trim().substring(0, 200),
                linkUrl: '/messages',
                fromUser: session.user.id,
              }),
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      ...newMsg,
      conversationId: targetConversationId,
    }, { status: 201 });
  } catch (error) {
    console.error('[Messages POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
