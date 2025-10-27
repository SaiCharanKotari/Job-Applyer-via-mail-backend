const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../config/config');
const auth = require('../middleware/jwtauth');
const multer = require('multer');
const IP = require('../schema/ipSchema');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auth, (req, res) => {
  res.status(201).json({ success: true, user: req.user });
});
router.get('/', async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // const ips = req.ips;
    // if (ip.startsWith('::ffff:')) {
    //   ip = ip.substring(7);
    // };

    if (!ip) return;
    const exist = await IP.findOne({ ip });
    if (exist) return;
    const newip = new IP({ ip });
    newip.save();
    res.json({ message: "successfully recived" });
  } catch (error) {
    console.log(error);
  }
})

router.post('/send', auth, (req, res) => {
  try {
    const { userId } = req.user;
    const { subject, message, mail } = req.body;
    const sql = "SELECT pdf, pdfname FROM users WHERE id = ?";
    db.query(sql, [userId], async (err, result) => {
      if (err || !result.length) return res.status(404).json({ success: false, message: "User or PDF not found" });
      const user = result[0];
      const pdfBase64 = user.pdf.toString("base64");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      });
      const mailOptions = {
        from: process.env.EMAIL,
        to: mail,
        subject: `${subject}`,
        text: `${message}`,
        attachments: [
          {
            filename: user.pdfname || "document.pdf",
            content: pdfBase64,
            encoding: "base64"
          }
        ]
      };
      await transporter.sendMail(mailOptions);
      res.status(201).json({ success: true, message: "Email sent with PDF attachment!" });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

router.post('/apply/:id', auth, upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file || false;
    const { subject, message, filename } = req.body;
    db.query('SELECT pdf FROM users where id=?', [id], (err, result) => {
      if (err) { return res.status(500).json({ success: false, message: "database problem" }) };
      if (!file && (result.length === 0)) return res.status(400).json({ success: false, message: "No file uploaded" });
    })
    if (!file) {
      const sql = "UPDATE users SET subject= ? ,message=?,pdfname=?  WHERE id = ?";
      db.query(sql, [subject, message, filename, id], (err, result) => {
        if (err) { return res.status(500).json({ success: false, message: "database problem" }) };
        res.status(201).json({ success: true, message: "File uploaded successfully!" });
      });
    } else {
      const sql = "UPDATE users SET pdf = ?,subject= ? ,message=?,pdfname=?  WHERE id = ?";
      db.query(sql, [file.buffer, subject, message, filename, id], (err, result) => {
        if (err) { return res.status(500).json({ success: false, message: "database problem" }) };
        res.status(201).json({ success: true, message: "File uploaded successfully!" });
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "server problem" })
  }
});
router.get('/apply', auth, async (req, res) => {
  try {
    const user = req.user;
    const sql = "SELECT subject, message, pdf,pdfname FROM users WHERE id=?";
    db.query(sql, [user.userId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "database problem" });
      if (result.length === 0) return res.status(404).json({ success: false, message: "Not found" });
      const data = result[0];
      res.status(200).json({ success: true, subject: data.subject, message: data.message, filename: data.pdfname })
    })
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
})

router.post('/login', async (req, res) => {
  try {
    const { mail, pass } = req.body;

    if (!mail || !pass) {
      return res.status(401).json({ success: false, message: "Please Enter Credentials" });
    }

    db.query('SELECT * FROM users WHERE email=?', [mail], async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Server Problem" });
      }

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid credentials" });
      }
      const user = results[0];
      const isValidPassword = await bcrypt.compare(pass, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const { password, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        message: 'Successfully logged in',
        user: userWithoutPassword
      });
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Problem" });
  }
});
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ success: false, message: "Please Enter Credentials" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    db.query('SELECT * FROM users WHERE email=?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Server Problem" });
      }
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }
      try {
        const hashpass = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashpass], (err, results) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: "Server Problem" });
          }
          res.status(201).json({ success: true, message: "Successfully created account" });
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Hashing problem" });
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Problem" });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;