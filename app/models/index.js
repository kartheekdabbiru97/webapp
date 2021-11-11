const dbConfig = require("../config/db.config");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.Host,
    dialect: dbConfig.dialect,
    operatorAliases: false,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("./user_model")(sequelize, Sequelize);
db.images = require("./image_model")(sequelize, Sequelize);

module.exports = db;