const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./Routes/authRoutes"));
app.use("/api/dashboard", require("./Routes/dashboardRoutes"));
app.use("/api/requests", require("./Routes/requestRoutes"));
app.use("/api/admin", require("./Routes/adminRoutes"));
app.use("/api/hospital", require("./Routes/hospitalRoutes"));

app.use("/api/donor", require("./Routes/donorRoutes"));
app.use("/api/inventory", require("./Routes/inventoryRoutes"));
app.use("/api/notifications", require("./Routes/notificationRoutes"));
app.use("/api/messages", require("./Routes/messageRoutes"));





if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`);
  });
}

module.exports = app;
