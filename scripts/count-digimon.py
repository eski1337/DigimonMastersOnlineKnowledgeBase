import json, sys
data = json.load(sys.stdin)
print(data.get("totalDocs", 0))
