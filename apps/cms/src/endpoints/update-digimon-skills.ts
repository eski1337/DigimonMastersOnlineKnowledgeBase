import { Endpoint } from 'payload/config';

const updateDigimonSkills: Endpoint = {
  path: '/update-digimon-skills',
  method: 'post',
  handler: async (req, res) => {
    try {
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized - Please login',
        });
      }

      // Check permissions (only admin and owner can update)
      if (!['admin', 'owner'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden - Requires admin or owner role',
        });
      }

      const { digimonId, skills } = req.body;

      if (!digimonId || !skills) {
        return res.status(400).json({
          error: 'Missing required fields: digimonId, skills',
        });
      }

      // Update the Digimon using Payload's API
      const updatedDigimon = await req.payload.update({
        collection: 'digimon',
        id: digimonId,
        data: {
          skills,
        },
      });

      return res.status(200).json({
        success: true,
        digimon: updatedDigimon,
      });
    } catch (error: any) {
      console.error('Error updating Digimon skills:', error);
      return res.status(500).json({
        error: error.message || 'Internal server error',
      });
    }
  },
};

export default updateDigimonSkills;
