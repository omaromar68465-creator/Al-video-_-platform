const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { createJob, getJob, updateJob } = require("./video-engine/queue");
const { processJob } = require("./video-engine/render-worker");

const crypto = require("crypto");
const app = express();

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

const sessionSecret =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");


app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const transactionsFile = path.join(dataDir, "transactions.json");
const videosFile = path.join(dataDir, "videos.json");

app.use(express.json());

app.use(
  "/generated-videos",
  express.static(path.join(__dirname, "video-engine", "output"))
);
app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify({ users: [] }, null, 2));
}

function getUsers() {
  try {
    const data = fs.readFileSync(usersFile, "utf8");
    return JSON.parse(data).users || [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    usersFile,
    JSON.stringify({ users }, null, 2)
  );
}

function getTransactions() {
  try {
    const data = fs.readFileSync(transactionsFile, "utf8");
    return JSON.parse(data) || [];
  } catch (error) {
    return [];
  }
}

function saveTransactions(transactions) {
  fs.writeFileSync(
    transactionsFile,
    JSON.stringify(transactions, null, 2)
  );
}

function getVideos() {
  try {
    const data = fs.readFileSync(videosFile, "utf8");
    return JSON.parse(data) || [];
  } catch (error) {
    return [];
  }
}

function saveVideos(videos) {
  fs.writeFileSync(
    videosFile,
    JSON.stringify(videos, null, 2)
  );
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "يجب تسجيل الدخول" });
  }

  const users = getUsers();
  const user = users.find(u => u.id === req.session.userId);

  if (!user || !user.active || user.role !== "admin") {
    return res.status(403).json({ success: false, message: "غير مصرح لك بالدخول" });
  }

  req.adminUser = user;
  next();
}

app.get("/api/admin/test", requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "تم التحقق من صلاحيات المشرف",
    admin: {
      id: req.adminUser.id,
      name: req.adminUser.name,
      email: req.adminUser.email,
      role: req.adminUser.role
    }
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const users = getUsers().map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    points: user.points,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt
  }));

  res.json({ success: true, users });
});
app.get("/api/admin/transactions", requireAdmin, (req, res) => {
  const transactions = getTransactions();
  res.json({ success: true, transactions });
});


app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "منصة إنشاء الفيديو تعمل بنجاح"
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      });
    }

    const users = getUsers();

    const emailExists = users.some(
      user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "هذا البريد الإلكتروني مستخدم بالفعل"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      points: 100,
      role: "user",
      active: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        points: newUser.points
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الحساب"
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال البريد الإلكتروني وكلمة المرور"
      });
    }

    const users = getUsers();

    const user = users.find(
      user => user.email === email.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "هذا الحساب غير نشط"
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول"
    });
  }
});

app.post("/api/admin/users/:id/points", requireAdmin, (req, res) => {
  const amount = Number(req.body.amount);
  const action = req.body.action;

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ success:false, message:"عدد النقاط غير صحيح" });
  }

  if (action !== "add" && action !== "subtract") {
    return res.status(400).json({ success:false, message:"نوع العملية غير صحيح" });
  }

  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ success:false, message:"المستخدم غير موجود" });
  }

  if (action === "subtract" && user.points < amount) {
    return res.status(400).json({ success:false, message:"رصيد المستخدم لا يكفي" });
  }

  const oldPoints = user.points;

  user.points = action === "add"
    ? user.points + amount
    : user.points - amount;

  saveUsers(users);

  const transactions = getTransactions();

  transactions.push({
    id: Date.now().toString(),
    type: action === "add" ? "add_points" : "subtract_points",
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    amount: amount,
    oldPoints: oldPoints,
    newPoints: user.points,
    adminId: req.adminUser.id,
    adminName: req.adminUser.name,
    createdAt: new Date().toISOString()
  });

  saveTransactions(transactions);

  res.json({
    success:true,
    message:"تم تعديل النقاط بنجاح",
    user:{
      id:user.id,
      name:user.name,
      email:user.email,
      points:user.points
    }
  });
});


app.post("/api/admin/users/:id/status", requireAdmin, (req, res) => {
  const active = req.body.active;
  const reason = String(req.body.reason || "").trim();

  if (typeof active !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "حالة الحساب غير صحيحة"
    });
  }

  if (!active && !reason) {
    return res.status(400).json({
      success: false,
      message: "يجب إدخال سبب عند تجميد الحساب"
    });
  }

  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "المستخدم غير موجود"
    });
  }

  if (user.id === req.adminUser.id) {
    return res.status(400).json({
      success: false,
      message: "لا يمكنك تغيير حالة حساب المشرف نفسه"
    });
  }

  user.active = active;

  if (active) {
    user.freezeReason = "";
  } else {
    user.freezeReason = reason;
  }

  saveUsers(users);

  res.json({
    success: true,
    message: active ? "تم إعادة تفعيل الحساب" : "تم تجميد الحساب",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      freezeReason: user.freezeReason
    }
  });
});


// ==================== VIDEO API ====================

app.get("/api/jobs/:jobId", (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول"
      });
    }

    const job = getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "المهمة غير موجودة"
      });
    }

    if (job.userId !== req.session.userId) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك الوصول إلى هذه المهمة"
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: Number(job.progress) || 0,
        error: job.error || "",
        videoPath: job.videoPath || "",
        completedAt: job.completedAt || null
      }
    });
  } catch (error) {
    console.error("GET /api/jobs/:jobId error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء قراءة حالة المهمة"
    });
  }
});

app.post("/api/videos", (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً"
      });
    }

    const users = getUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود"
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "هذا الحساب غير نشط"
      });
    }

    const {
      title,
      description,
      duration,
      videoType,
      extraText,
      sceneTexts,
      voice,
      textOption
    } = req.body;

    const durationNumber = Number(duration);

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال وصف الفيديو"
      });
    }

    if (
      !Number.isInteger(durationNumber) ||
      durationNumber < 1 ||
      durationNumber > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "مدة الفيديو يجب أن تكون بين دقيقة و10 دقائق"
      });
    }

    const pointsCost = durationNumber * 10;

    if (user.points < pointsCost) {
      return res.status(400).json({
        success: false,
        message: "رصيد النقاط غير كافٍ",
        requiredPoints: pointsCost,
        currentPoints: user.points
      });
    }

    const oldPoints = user.points;

    user.points -= pointsCost;
    saveUsers(users);

    const videos = getVideos();

    const video = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      title: String(title || "فيديو بدون عنوان").trim().slice(0, 100),
      description: String(description).trim().slice(0, 5000),
      duration: durationNumber,
      videoType: String(videoType || "عام").trim().slice(0, 100),
      extraText: String(extraText || "").trim().slice(0, 2000),
      sceneTexts: Array.isArray(sceneTexts)
        ? sceneTexts.map(text => String(text || "").trim().slice(0, 2000)).slice(0, 100)
        : [],
      voice: String(voice || "بدون صوت").trim().slice(0, 100),
      textOption: String(textOption || "بدون نص").trim().slice(0, 100),
      pointsUsed: pointsCost,
      status: "pending",
      videoUrl: "",
      createdAt: new Date().toISOString()
    };

    videos.push(video);
    saveVideos(videos);

    const transactions = getTransactions();

    transactions.push({
      id: Date.now().toString() + "-video",
      type: "video_create",
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      amount: -pointsCost,
      oldPoints: oldPoints,
      newPoints: user.points,
      videoId: video.id,
      createdAt: new Date().toISOString()
    });

    saveTransactions(transactions);

    const job = createJob({
      videoId: video.id,
      userId: user.id,
      input: {
        title: video.title,
        description: video.description,
        duration: video.duration,
        videoType: video.videoType,
        extraText: video.extraText,
        sceneTexts: video.sceneTexts,
        voice: video.voice,
        textOption: video.textOption
      }
    });

    setImmediate(() => {
      processJob(job.id)
        .then((result) => {
          const currentVideos = getVideos();
          const currentVideo = currentVideos.find(v => v.id === video.id);

          if (currentVideo) {
            currentVideo.status = "completed";
            currentVideo.videoUrl = "/generated-videos/" + path.basename(result.outputFile);
            currentVideo.jobId = job.id;
            currentVideo.completedAt = new Date().toISOString();
            saveVideos(currentVideos);
          }
        })
        .catch((error) => {
          console.error("VIDEO RENDER ERROR:", error.message);

          const currentVideos = getVideos();
          const currentVideo = currentVideos.find(v => v.id === video.id);

          if (currentVideo) {
            currentVideo.status = "failed";
            currentVideo.jobId = job.id;
            currentVideo.error = error.message;
            saveVideos(currentVideos);
          }
        });
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء مهمة الفيديو وبدء المعالجة",
      video: video,
      jobId: job.id,
      points: user.points
    });

  } catch (error) {
    console.error("VIDEO API ERROR:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الفيديو"
    });
  }
});

// ==================== END VIDEO API ====================


// ==================== USER VIDEOS LIST API ====================

app.get("/api/videos", (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً"
      });
    }

    const users = getUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود"
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "هذا الحساب غير نشط"
      });
    }

    const videos = getVideos();

    const userVideos = videos
      .filter(video => video.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      videos: userVideos
    });

  } catch (error) {
    console.error("VIDEO LIST ERROR:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الفيديوهات"
    });
  }
});

// ==================== END USER VIDEOS LIST API ====================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
