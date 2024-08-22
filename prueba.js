require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const path = require('path');
const session = require('express-session');

// Crear la instancia de Express
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());


// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'ArchivosHTML')));


console.log(process.env.MONGO_LOCAL_URL);

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_LOCAL_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Conectado a MongoDB."))
    .catch(e => {
        console.error("ERROR al conectarse a MongoDB: ", e);
        process.exit(1);
});

//conectar con la sesion
// Configuración de la sesión
app.use(session({
    secret: 'Dani7890', // Cambia esto por una cadena secreta segura
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_LOCAL_URL, // Usa la URL de tu base de datos MongoDB
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 día de duración
}));



// Definición de esquemas y modelos
const UsuariosSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, maxlength: 80 },
        correo: { type: String, required: true, unique: true, maxlength: 50 },
        usuario: { type: String, required: true, maxlength: 50 },
        contrasena: { type: String, required: true, maxlength: 100 }
    },
    {
        timestamps: true
    }
);

const ElementosSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, maxlength: 50 },
        numero_atomico: { type: Number, required: true, min: 0 },
        simbolo: { type: String, required: true, maxlength: 50 },
        grupo: { type: Number, required: true, min: 0 },
        periodo: { type: Number, required: true, min: 0 },
        radio_atomico: { type: Number, required: true, min: 0 },
        energia_de_ionizacion: { type: Number, required: true, min: 0 },
        electronegatividad: { type: Number, required: true, min: 0 },
        bloque: { type: String, required: true, unique: false, maxlength: 50 },
    },
    {
        timestamps: true
    }
);

const JuegosSchema = new mongoose.Schema(
    {
        nombre_juego: { type: String, required: true, maxlength: 100 }
    },
    {
        timestamps: true
    }
);

const PartidasSchema = new mongoose.Schema(
    {
        victoria: { type: Boolean },
        hora_inicio: { type: Date },
        hora_fin: { type: Date },
        usuarios: { type: mongoose.Schema.Types.ObjectId, ref: "usuarios", required: true },
        juegos: { type: mongoose.Schema.Types.ObjectId, ref: "juegos", required: true },
    },
    {
        timestamps: true
    }
);

// Definición de modelos

const UsuariosModel = mongoose.model("usuarios", UsuariosSchema);
const ElementosModel = mongoose.model("elementos", ElementosSchema);
const PartidasModel = mongoose.model("partida", PartidasSchema);
const JuegosModel = mongoose.model("juegos", JuegosSchema);

// Rutas GET

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'ArchivosHTML', 'login.html'));
});



//RUTAS POST
// Ruta de inicio de sesión
/*
app.post("/login", async (req, res) => {
    const { correo, contrasena } = req.body;
    const usuario = await Usuario.findOne({ correo, contrasena });

    if (usuario) {
        req.session.userId = usuario._id;
        res.redirect("/pagina1.html");
    } else {
        res.status(401).send("Credenciales incorrectas");
    }
});*/


// Tu código de rutas y lógica de la aplicación aquí
app.post("/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;
        const usuario = await UsuariosModel.findOne({ correo, contrasena });

        if (usuario) {
            req.session.userId = usuario._id;
            console.log('Usuario iniciado sesión:', req.session.userId);
            res.json({ success: true, message: "Inicio de sesión exitoso" });
        } else {
            res.status(401).json({ success: false, message: "Correo o contraseña incorrecta" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

// Ruta protegida
app.get("/pagina1.html", (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'ArchivosHTML', 'pagina1.html'));
    } else {
        res.redirect("/login.html");
    }
});

app.get("/juego2.html", (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'ArchivosHTML', 'juego2.html'));
    } else {
        res.redirect("/login.html");
    }
});

//ruta get del perfil 
app.get('/perfil', async (req, res) => {
    console.log('Session userId:', req.session.userId);
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const usuario = await UsuariosModel.findById(req.session.userId);
        if (!usuario) {
            return res.status(500).json({ error: 'Error al obtener el perfil del usuario' });
        }

        res.json({
            nombre: usuario.nombre,
            correo: usuario.correo,
            usuario: usuario.usuario
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el perfil del usuario' });
    }
});


// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }

        res.clearCookie('connect.sid'); // Limpia la cookie de sesión
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    });
});




// Ruta para manejar el envío del formulario
app.post("/usuarios", async (req, res) => {
    try {
        const { nombre, correo, usuario, contrasena } = req.body;
        if (!nombre || !correo || !usuario || !contrasena) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }
        const nuevoUsuario = new UsuariosModel({ nombre, correo, usuario, contrasena });
        await nuevoUsuario.save();
        res.redirect("/login.html"); // Redirigir a login.html tras guardar exitosamente
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al guardar el usuario");
    }
});

/*comentario */
//ruta para enviar 5 elementos aleatorios cada que se recargue



// Ejemplo de ingreso de un dato
/*
{
    "nombre": "Juan Perez",
    "correo": "juan.perez@gmail.com",
    "usuario": "juanperez",
    "contrasena": "juanito"
}
 */

app.get("/usuarios", async function (req, res) {
    try {
        const documentos = await UsuariosModel.find().exec();
        res.json(documentos);
    } catch (e) {
        console.error(e);
        res.json({ error: "Error al consultar todos los jugadores en la BD" });
    }
});

app.get("/usuarios/:id", async function (req, res) {
    try {
        const { id } = req.params;
        const documento = await UsuariosModel.findById(id).exec();
        res.json(documento);
    } catch (e) {
        console.error(e);
        res.json({ error: "Error al consultar un jugador por id en la BD" });
    }
});

app.get("/elementos", async function (req, res) {
    try {
        const documentos = await ElementosModel.find().exec();
        res.json(documentos);
    } catch (e) {
        console.error(e);
        res.json({ error: "Error al consultar todos los elementos en la BD" });
    }
});

// ruta para obtener los elementos al azar 
app.get('/elementos/aleatorios', async (req, res) => {
    try {
        const elementos = await ElementosModel.aggregate([
            { $sample: { size: 10 } } // Devuelve 5 documentos al azar  cada que se recarga la pagina
        ]);
        res.json(elementos);
    } catch (error) {
        res.status(500).send(error);
    }
});


/*La información de radio atómico está en picómetros (pm), la energía de ionización
 en kJ/mol y la electronegatividad es según la escala de Pauling. */


/* Iniciar el servidor
*/

app.listen(process.env.PORT_SERVER || 3000, function () {
    console.log("Servidor de Express en el puerto " + process.env.PORT_SERVER);
});
