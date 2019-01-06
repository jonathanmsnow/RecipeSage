var crypto = require('crypto');

'use strict';

module.exports = (sequelize, DataTypes) => {
  let currentPasswordVersion = 2;

  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: DataTypes.TEXT,
    email: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    passwordSalt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    passwordVersion: {
      type: DataTypes.INTEGER,
      defaultValue: currentPasswordVersion,
      allowNull: false
    },
    lastLogin: DataTypes.DATE
  }, {});
  User.associate = function(models) {
    User.hasMany(models.Session, {
      foreignKey: 'userId'
    });

    User.hasMany(models.FCMToken, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Recipe, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Label, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Message, {
      foreignKey: 'toUserId',
      as: 'receivedMessages'
    });

    User.hasMany(models.Message, {
      foreignKey: 'fromUserId',
      as: 'sentMessages'
    });

    User.hasMany(models.ShoppingList, {
      foreignKey: 'userId',
      as: 'ownedShoppingLists'
    });

    User.belongsToMany(models.ShoppingList, {
      foreignKey: 'userId',
      otherKey: 'shoppingListId',
      as: 'collaboratingShoppingLists',
      through: 'ShoppingList_Collaborator'
    });

    User.hasMany(models.ShoppingListItem, {
      foreignKey: 'userId',
      as: 'shoppingListItems'
    });

    User.hasMany(models.MealPlan, {
      foreignKey: 'userId',
      as: 'mealPlans'
    });

    User.belongsToMany(models.MealPlan, {
      foreignKey: 'userId',
      otherKey: 'mealPlanId',
      as: 'collaboratingMealPlans',
      through: 'MealPlan_Collaborator'
    });
  };

  User.generateHashedPassword = function (password) {
    var salt = crypto.randomBytes(128).toString('base64');
    var hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');

    return {
      hash: hash,
      salt: salt,
      version: currentPasswordVersion
    };
  };

  User.validateHashedPassword = function (password, hash, salt, version) {
    switch (version) {
      case 1:
      case '1':
        return hash == crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
      case 2:
      case '2':
        return hash == crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');
    }

    return false;
  };

  User.login = function (email, password, transaction) {
    // Setup error
    var e = new Error("Credentials are not valid!");
    e.status = 412;

    return User.find({
      where: {
        email: email.toLowerCase()
      },
      transaction
    }).then(user => {
      if (!user) {
        throw e;
      } else {
        return user.validatePassword(password, transaction).then(isValid => {
          if (!isValid) {
            throw e;
          }

          return Promise.resolve(user);
        });
      }
    });
  }

  User.prototype.updatePassword = function (password, transaction) {
    let data = User.generateHashedPassword(password);

    this.passwordHash = data.hash;
    this.passwordSalt = data.salt;
    this.passwordVersion = data.version;

    return this.save({ transaction });
  }

  User.prototype.validatePassword = function (password, transaction) {
    return new Promise(resolve => {
      let isValid = User.validateHashedPassword(password, this.passwordHash, this.passwordSalt, this.passwordVersion);

      // Don't update if password isn't valid, or password is of current version
      if (!isValid || this.passwordVersion == currentPasswordVersion) {
        resolve(isValid);
        return;
      }

      return this.updatePassword(password, transaction).then(() => {
        resolve(isValid);
      });
    });
  };

  return User;
};
