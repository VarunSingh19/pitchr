const mongoose = require("mongoose");
const MONGO_URL = "mongodb+srv://technologyfactsxd_db_user:aeX38fAEfUDPsQac@cluster0.yca4q6h.mongodb.net/email-automation?appName=Cluster0";

// Define Schemas inline to make running self-contained
const EmailLogSchema = new mongoose.Schema({
  campaignId: mongoose.Schema.Types.ObjectId,
  recipientEmail: String,
  companyName: String,
  role: String,
  status: String,
  subject: String,
  body: String,
  error: String,
  generationError: String,
}, { timestamps: true });

const CampaignSchema = new mongoose.Schema({
  name: String,
  status: String,
  totalLeads: Number,
  sentCount: Number,
  failedCount: Number,
  autoSend: Boolean,
}, { timestamps: true });

const EmailLog = mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema, "emaillogs");
const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema, "campaigns");

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("Connected successfully.\n");

    console.log("--- LATEST CAMPAIGN ---");
    const latestCampaign = await Campaign.findOne().sort({ createdAt: -1 });
    if (!latestCampaign) {
      console.log("No campaigns found!");
      return;
    }
    console.log(`Campaign ID: ${latestCampaign._id}`);
    console.log(`Name: ${latestCampaign.name}`);
    console.log(`Status: ${latestCampaign.status}`);
    console.log(`Total Leads: ${latestCampaign.totalLeads}`);
    console.log(`Auto Send: ${latestCampaign.autoSend}`);
    console.log(`Created At: ${latestCampaign.createdAt}\n`);

    console.log("--- ASSOCIATED EMAIL LOGS ---");
    const logs = await EmailLog.find({ campaignId: latestCampaign._id });
    console.log(`Found ${logs.length} logs for this campaign.`);
    
    logs.forEach((log, index) => {
      console.log(`[${index + 1}] Company: ${log.companyName} | Recipient: ${log.recipientEmail}`);
      console.log(`    Status: ${log.status}`);
      if (log.generationError || log.error) {
        console.log(`    GenError: ${log.generationError}`);
        console.log(`    SendError: ${log.error}`);
      }
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

run();
