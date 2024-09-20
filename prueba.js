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
    secret: 'Dani7890', //cadena secreta segura
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_LOCAL_URL, // 
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 día de duración
}));



// Definición de esquemas y modelos
const UsuariosSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, maxlength: 80 },
        correo: { type: String, required: true, unique: true, maxlength: 50 },
        usuario: { type: String, required: true, maxlength: 50, unique:true},
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
        Id: { type: Number, required: true },
        nombre_juego: { type: String, required: true, maxlength: 100 }
    },
    {
        timestamps: true
    }
);

const PartidasSchema = new mongoose.Schema(
    {
       
        usuarios: { type: mongoose.Schema.Types.ObjectId, ref: "usuarios", required: true },
        juegos: { type: mongoose.Schema.Types.ObjectId, ref: "juegos", required: true },
        numArrastres: { type: Number, required: true },
        hora_inicio: { type: Date },
        hora_fin: { type: Date },
        calificacion: { type: Number, required: true } // Calificación obtenida
    },
    {
        timestamps: true
    }
);

//modelo para el question, el json esta en la carpeta json con nombre de Questions
const questionSchema = new mongoose.Schema({
    question: String,
    correctAnswer: Boolean,
    elementSymbol: String
});

const QuestionModel = mongoose.model('questions', questionSchema); 

// Definición de modelos

const UsuariosModel = mongoose.model("usuarios", UsuariosSchema);
const ElementosModel = mongoose.model("elementos", ElementosSchema);
const PartidasModel = mongoose.model("partida", PartidasSchema);
const JuegosModel = mongoose.model("juegos", JuegosSchema);

// Rutas GET

//demas rutas 
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'ArchivosHTML', 'login.html'));
});



//RUTAS POST
//obtiene el resultado 
// Endpoint para obtener resultados de las partidas
app.get('/obtener-resultados', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'ID de usuario no proporcionado' });
    }
//obtiene el id del usario y el id del juego
    try {
        const resultados = await PartidasModel.find({ usuarios: userId }).populate('juegos').exec();
        res.json(resultados);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los resultados' });
    }
});

//SI YA EXISTE UNA PREGUNTA
// Ruta para obtener una pregunta aleatoria por símbolo de elemento.
app.get('/pregunta-aleatoria/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        
        // Encuentra todas las preguntas que coincidan con el símbolo del elemento
        const preguntas = await QuestionModel.find({ elementSymbol: symbol });

        // Si no hay preguntas
        if (preguntas.length === 0) {
            return res.status(404).json({ success: false, message: 'No hay preguntas para este elemento.' });
        }

        // Selecciona una pregunta aleatoria
        const preguntaAleatoria = preguntas[Math.floor(Math.random() * preguntas.length)];
        res.json({ success: true, pregunta: preguntaAleatoria });
    } catch (error) {
        console.error('Error al obtener la pregunta:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

/*PAra guardar mis preguntas */
app.post('/agregar-pregunta', (req, res) => {
    const { question, correctAnswer, elementSymbol } = req.body;

    // Verifica que los datos sean correctos
    if (!question || !elementSymbol || typeof correctAnswer !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Datos inválidos.' });
    }


    // Asegurar que la pregunta comience y termine con signos de interrogación.
    if (!question.startsWith('¿')) {
        question = '¿' + question;
    }
    if (!question.endsWith('?')) {
        question = question + '?';
    }
    
    const nuevaPregunta = new QuestionModel({
        question: question,
        correctAnswer: correctAnswer,
        elementSymbol: elementSymbol
    });

    // Guarda en la base de datos
    nuevaPregunta.save()
        .then(() => res.json({ success: true, message: 'Pregunta agregada exitosamente.' }))
        .catch((error) => {
            console.error('Error al guardar en la base de datos:', error);
            res.status(500).json({ success: false, message: 'Error al guardar la pregunta.' });
        });
});


app.post('/guardar-resultado', async (req, res) => {
    const { userId, juegoId, numArrastres } = req.body;

    try {
        // Busca el juego en la colección de juegos por su ID
        const juego = await JuegosModel.findOne({ Id: juegoId });
        if (!juego) {
            return res.status(404).json({ error: 'Juego no encontrado' });
        }

        // Busca el usuario en la colección de usuarios por su nombre de usuario
        const usuario = await UsuariosModel.findOne({ usuario: userId }); // busca al usuario
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // if de las reglas del juego
        //el primer juego pone de regla ganar el 10 si el usuario hace el menor numero de arrastres
        //el tercero, cuarto y quinto juego, hace que pueda hacer los mayores arratres pero en cuanto mayor sea su arrastre, menor será la calificacion
        //para obtener el 10 se necesita hacer 10 arrastres
        let calificacion = 0;
        switch (parseInt(juegoId)) {  
            case 1:
                calificacion = numArrastres <= 4 ? 10 : Math.max(10 - (numArrastres - 4), 0);
                break;
            case 2:
            case 3:
            case 4:
                calificacion = numArrastres <= 10 ? 10 : Math.max(10 - (numArrastres - 10), 0);
                break;
            default:
                calificacion = 0;
        }

        // Crea y guardar una nueva partida
        const nuevaPartida = new PartidasModel({
            usuarios: usuario._id,  
            juegos: juego._id,
            numArrastres: numArrastres,
            hora_inicio: new Date(),
            hora_fin: new Date(),
            calificacion: calificacion
        });

        await nuevaPartida.save();

        res.status(201).json({ message: 'Resultado guardado correctamente', partida: nuevaPartida });
    } catch (error) {
        console.error('Error al guardar el resultado del juego:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// para hacer valido el login 
app.post("/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;
        const usuario = await UsuariosModel.findOne({ correo, contrasena });

        if (usuario) {
            req.session.userId = usuario._id;
            console.log('Usuario iniciado sesión:', req.session.userId =usuario._id); //aqui cambie el final agregeue lo de = ..
            res.json({ success: true, message: "Inicio de sesión exitoso" });
        } else {
            res.status(401).json({ success: false, message: "Correo o contraseña incorrecta" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});


//get de preguntas para mostrarse en el juego 4
app.get('/get-question/:simbolo', async (req, res) => {
    const { simbolo } = req.params;  //el parametro para validar es el simbolo
    try {
        const question = await QuestionModel.findOne({ elementSymbol: simbolo }); //Utiliza findOne  para buscar el campo elementSymbol y coincida con el valor del parámetro simbolo de elementos
        if (question) { //si se compara elemeSymbol con simbolo, se manda la pregunta almacenada en question
            res.json(question); 
        } else {
            res.status(404).json({ message: 'No se encontró la pregunta para este elemento.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la pregunta' });
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
            id: usuario._id,
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
