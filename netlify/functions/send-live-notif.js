Key Type	Scope	Used For
App API Key	Single app	Sending messages, creating users, app-level operations
Organization API Key	Entire organization	Creating apps, managing API keys, org-level configuration
You can create up to 16 API keys and configure IP allowlisting.
Both are private secrets and must be stored securely.

App API key

Use an App API Key for most REST API requests related to a specific app. Authentication format: Include the key in the Authorization header with the key authentication scheme:
Authorization: key YOUR_REST_API_KEY
You can create App API Keys in App Settings > Keys & IDs or via the Create API key API.
