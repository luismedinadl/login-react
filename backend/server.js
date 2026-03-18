const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const csrf = require("csurf");
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");
const axios = require("axios");
const logger = require("./logger");

const app = express();


// ================= SEGURIDAD HEADERS =================
app.use(helmet()); // HSTS, CSP básico, etc


// ================= MIDDLEWARE =================
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());


// ================= SESIONES =================
app.use(session({
  secret: "clave_super_secreta",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true solo con https
}));


// ================= CSRF =================
const csrfProtection = csrf({ cookie: false });


// ================= MYSQL =================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "loginDB"
  
});

db.connect(() => {
  console.log("✅ MySQL conectado");
});


// ================= JWT =================
const SECRET = "clave_jwt_segura";


// ================= MIDDLEWARE AUTENTICACIÓN =================
function verificarToken(req, res, next) {

  const token = req.headers["authorization"];

  if (!token) return res.status(401).json({ msg: "Acceso denegado" });

  jwt.verify(token, SECRET, (err, decoded) => {

    if (err) return res.status(403).json({ msg: "Token inválido" });

    req.user = decoded;
    next();
  });
}


// ================= CONTROL ROLES =================
function soloAdmin(req, res, next) {

  if (req.user.rol !== "admin") {

    logger.warn({
      event: "ACCESS_DENIED",
      usuario: req.user.usuario,
      ip: req.ip,
      recurso: "/admin"
    });

    return res.status(403).json({ msg: "Solo administradores" });
  }

  next();
}


// ================= CSRF TOKEN =================
app.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});


// ================= REGISTRO =================
app.post("/register",

  // VALIDACIÓN Y SANITIZACIÓN
  body("usuario")
  .isEmail()
  .normalizeEmail(),
  body("password").isLength({ min: 8 }),

  async (req, res) => {

    const errores = validationResult(req);

    if (!errores.isEmpty()) {
      return res.json({ msg: "Datos inválidos" });
    }

    const { usuario, password, captchaToken } = req.body;

    // ================= VALIDAR CAPTCHA =================
  try {

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: "6Ld-c4YsAAAAAI8tzAwUyvaW_lOSVU-LFaYpKYcq",
          response: captchaToken
        }
      }
    );

    if (!response.data.success) {
      return res.json({ msg: "Captcha inválido" });
    }

  } catch (error) {
    return res.json({ msg: "Error verificando captcha" });
  }

    db.query(
      "SELECT * FROM usuarios WHERE usuario=?",
      [usuario],
      async (err, result) => {

        if (result.length > 0) {
          return res.json({ msg: "Usuario ya existe" });
        }

        const hash = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO usuarios(usuario,password,rol) VALUES(?,?,?)",
          [usuario, hash, "user"],
          () => {

            logger.info({
      event: "USER_REGISTER",
      usuario: usuario,
      ip: req.ip
    });
    
            res.json({ msg: "Usuario registrado" });
          }
        );
      }
    );
  }
);


// ================= LOGIN =================
app.post("/login", async (req, res) => {

  const { usuario, password, captchaToken } = req.body;

  // ================= VALIDAR CAPTCHA =================
  try {

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: "6Ld-c4YsAAAAAI8tzAwUyvaW_lOSVU-LFaYpKYcq",
          response: captchaToken
        }
      }
    );

    if (!response.data.success) {
      return res.json({ msg: "Captcha inválido" });
    }

  } catch (error) {
    return res.json({ msg: "Error verificando captcha" });
  }

  db.query(
    "SELECT * FROM usuarios WHERE usuario=?",
    [usuario],
    async (err, result) => {

      if (result.length === 0) {

        logger.warn({
    event: "LOGIN_FAILED",
    usuario: usuario,
    ip: req.ip
  });

  return res.json({ msg: "Credenciales inválidas" });
}

const user = result[0];

const valido = await bcrypt.compare(password, user.password);

if (!valido) {

  logger.warn({
    event: "LOGIN_FAILED",
    usuario: usuario,
    ip: req.ip
  });

  return res.json({ msg: "Credenciales inválidas" });
}

    logger.info({
  event: "LOGIN_SUCCESS",
  usuario: user.usuario,
  ip: req.ip
});

      // GENERAR TOKEN
      const token = jwt.sign({
        id: user.id,
        usuario: user.usuario,
        rol: user.rol
      }, SECRET, { expiresIn: "1h" });

      res.json({
        msg: "Login correcto",
        token
      });
    }
  );
});


// ================= RUTA PROTEGIDA =================
app.get("/perfil", verificarToken, (req, res) => {

  res.json({
    msg: "Acceso permitido",
    usuario: req.user.usuario,
    rol: req.user.rol
  });
});


// ================= SOLO ADMIN =================
app.get("/admin", verificarToken, soloAdmin, (req, res) => {

  res.json({
    msg: "Panel administrador"
  });
});


// ================= SERVIDOR =================
app.listen(5000, () => {
  console.log("🚀 Servidor seguro activo");
});