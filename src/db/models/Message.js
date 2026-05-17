const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/index');
const User = require('./User');
const Room = require('./Room');

class Message extends Model {}

Message.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: 'id',
    },
  },
  roomId: {
    type: DataTypes.UUID,
    references: {
      model: Room,
      key: 'id',
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Message',
  tableName: 'messages',
  timestamps: true,
});

Message.belongsTo(User, { foreignKey: 'userId' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

module.exports = Message;