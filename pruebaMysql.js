require("dotenv").config();

////////////////////////////////////////////////
const { Sequelize, DataTypes, json } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  username: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
});

async function connect() {
  try {
    await sequelize.authenticate();
    console.log("Conectado a la BD.");
  } catch (e) {
    console.error("No se puede conectar a la BD.");
    console.error(e);
  }
}

connect();

const Usuarios = sequelize.define(
  "usuarios",
  {
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    correo: {
      type: DataTypes.STRING(70),
      allowNull: false,
    },
    usuario: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    contrasena: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
  },
  {
    timestamps: false,
  }
);

const Elementos = sequelize.define("elementos", {
    asientosDisponibles: {
      field: "asientos_disponibles",
      type: DataTypes.INTEGER,
      validate: { min: 0, max: 40 },
      allowNull: false,
      defaultValue: 40,
    },
    fechaSalida: {
      field: "fecha_salida",
      type: DataTypes.DATE,
      allowNull: false,
    },
    precio: {
      type: DataTypes.DOUBLE,
      validate: { min: 0.0, max: 5000.0 },
      allowNull: false,
    },
  });