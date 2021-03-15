const mongoose = require("mongoose");

const integrationSchema = mongoose.Schema({
  name: String,
  authAccessToken: String,
  authRefreshToken: String,
  authMethod: {
    type: String,
    enum: ["OAUTH2", "API_KEY"]
  },
  projectId: String,
  userId: String,
  thirdPartyProjects: [
    {
      organizationId: String,
      organizationName: String,
      projectName: String,
      projectId: String,
      projectDescription: String,
      projectRef: String,
      projectIcon: String,
      projectSpecificParams: mongoose.SchemaTypes.Mixed
    }
  ],
  webhookStatus: {
    type: String,
    enum: ["INACTIVE", "ACTIVE"],
    default: "INACTIVE"
  },
  icon: String,
  primaryAction: { type: mongoose.Schema.Types.Mixed },
  integrationSpecificParams: mongoose.SchemaTypes.Mixed
});

module.exports = mongoose.model("Integration", integrationSchema);
