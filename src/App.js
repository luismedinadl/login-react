import logo from './logo.svg';
import { useState } from "react";
import './App.css';
import ReCAPTCHA from "react-google-recaptcha";

function App() {

  // CONTROL DE PANTALLAS
  const [vista, setVista] = useState("login");
  // login | registro | privada

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  // Captcha
  const [captcha, setCaptcha] = useState(null);


  // ================= LOGIN =================
  function login() {

    if (usuario.trim() === "" || password === "") {
      mostrar("Completa todos los campos", "danger");
      return;
    }

    // Validar CAPTCHA
    if (!captcha) {
      mostrar("Completa el CAPTCHA", "danger");
      return;
    }

    fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario,
        password,
        captchaToken: captcha
      })
    })
      .then(res => res.json())
      .then(data => {

        if (data.token) {

          localStorage.setItem("token", data.token);

          setVista("privada");

        } else {

          mostrar(data.msg, "danger");

        }

      });

  }


  // ================= REGISTRO =================
  function registrar() {

    //Captcha
    if (!captcha) {
      mostrar("Completa el CAPTCHA", "danger");
      return;
    }

    // Validar email
    if (!validarEmail(usuario)) {
      mostrar("Ingresa un correo válido", "danger");
      return;
    }

    if (password.length < 8) {
      mostrar("Mínimo 8 caracteres", "danger");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      mostrar("Debe tener mayúscula", "danger");
      return;
    }

    if (!/[a-z]/.test(password)) {
      mostrar("Debe tener minúscula", "danger");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      mostrar("Debe tener carácter especial", "danger");
      return;
    }

    if (tieneNumerosConsecutivos(password)) {
      mostrar("No números consecutivos", "danger");
      return;
    }

    if (tieneLetrasConsecutivas(password)) {
      mostrar("No letras consecutivas", "danger");
      return;
    }


    fetch("http://localhost:5000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario,
        password,
        captchaToken: captcha
      })
    })
      .then(res => res.json())
      .then(data => {

        if (data.msg.includes("existe")) {
          mostrar(data.msg, "danger");
        } else {
          mostrar("Registro exitoso, ahora inicia sesión", "success");
          setVista("login");
          limpiar();
        }

      });

  }


  // ================= UTILIDADES =================

  function validarEmail(email) {

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);
  }

  function mostrar(texto, tipo) {
    setMensaje(texto);
    setTipo(tipo);
  }

  function limpiar() {
    setUsuario("");
    setPassword("");
    setMensaje("");
  }

  function tieneNumerosConsecutivos(texto) {

    for (let i = 0; i < texto.length - 1; i++) {

      let a = texto[i];
      let b = texto[i + 1];

      if (!isNaN(a) && !isNaN(b)) {
        if (Number(b) === Number(a) + 1) return true;
      }
    }

    return false;
  }


  function tieneLetrasConsecutivas(texto) {

    texto = texto.toLowerCase();

    for (let i = 0; i < texto.length - 1; i++) {

      let a = texto.charCodeAt(i);
      let b = texto.charCodeAt(i + 1);

      if (a >= 97 && a <= 122 && b >= 97 && b <= 122) {
        if (b === a + 1) return true;
      }
    }

    return false;
  }


  // ================= PANTALLA PRIVADA =================

  if (vista === "privada") {
    return (
      <div className="container vh-100 d-flex justify-content-center align-items-center">

        <div className="text-center">

          <h1 className="text-success">✅ Sesión iniciada correctamente</h1>

          <p className="mt-3">
            Bienvenido, <strong>{usuario}</strong>
          </p>

          <button
            className="btn btn-danger mt-3"
            onClick={() => {
              setVista("login");
              limpiar();
            }}
          >
            Cerrar sesión
          </button>

        </div>

      </div>
    );
  }


  // ================= LOGIN =================

  if (vista === "login") {
    return (
      <div className="container vh-100 d-flex justify-content-center align-items-center">

        <div className="card p-4 shadow" style={{ width: "400px" }}>

          <h3 className="text-center mb-3">Iniciar Sesión</h3>

          <input
            className="form-control mb-3"
            placeholder="Correo electrónico"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
          />

          <div className="input-group mb-3">

            <input
              type={verPassword ? "text" : "password"}
              className="form-control"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setVerPassword(!verPassword)}
            >
              {verPassword ? "🙈" : "👁️"}
            </button>

          </div>

          <div className="mb-3 d-flex justify-content-center">
            <ReCAPTCHA
              sitekey="6Ld-c4YsAAAAABEWVCGag0osjxeUhSwpUVkTpuzu"
              onChange={(value) => setCaptcha(value)}
            />
          </div>


          <button
            className="btn btn-primary w-100"
            onClick={login}
          >
            Entrar
          </button>

          <button
            className="btn btn-link w-100 mt-2"
            onClick={() => {
              limpiar();
              setVista("registro");
            }}
          >
            ¿No tienes cuenta? Regístrate
          </button>


          {mensaje && (
            <div className={`alert alert-${tipo} mt-3 text-center`}>
              {mensaje}
            </div>
          )}

        </div>

      </div>
    );
  }


  // ================= REGISTRO =================

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">

      <div className="card p-4 shadow" style={{ width: "400px" }}>

        <h3 className="text-center mb-3">Registro</h3>

        <input
          className="form-control mb-3"
          placeholder="Correo electrónico"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
        />

        <div className="input-group mb-3">

          <input
            type={verPassword ? "text" : "password"}
            className="form-control"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setVerPassword(!verPassword)}
          >
            {verPassword ? "🙈" : "👁️"}
          </button>

        </div>

        <div className="mb-3 d-flex justify-content-center">
          <ReCAPTCHA
            sitekey="6Ld-c4YsAAAAABEWVCGag0osjxeUhSwpUVkTpuzu"
            onChange={(value) => setCaptcha(value)}
          />
        </div>

        <button
          className="btn btn-success w-100"
          onClick={registrar}
        >
          Registrar
        </button>

        <button
          className="btn btn-link w-100 mt-2"
          onClick={() => {
            limpiar();
            setVista("login");
          }}
        >
          Volver al login
        </button>


        {mensaje && (
          <div className={`alert alert-${tipo} mt-3 text-center`}>
            {mensaje}
          </div>
        )}

      </div>

    </div>
  );

}

export default App;