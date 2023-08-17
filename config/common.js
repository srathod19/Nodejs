var con = require('./database');
var GLOBALS = require('./constants');
var cryptoLib = require('cryptlib');
var shaKey = cryptoLib.getHashSha256(GLOBALS.KEY, 32);
const localizify = require('localizify');
const en = require('../languages/en.js');
const {
    t
} = require('localizify');
const asyncLoop = require('node-async-loop');

var Validate = {

    /**
     * Function to generate the random hash for token
     * 14-06-2021
     * @param {Login User ID} user_id 
     * @param {Function} callback 
     */
    generateSessionCode: function (user_id, user_type, callback) {

        var randtoken = require('rand-token').generator();
        var usersession = randtoken.generate(64, "0123456789abcdefghijklnmopqrstuvwxyz");
        
        Validate.checkDeviceInfo(user_id, user_type, function (DeviceInfo, Error) {
            if (DeviceInfo != null) {
                var params = {
                    token: usersession
                };
                Validate.updateDeviceInfo(user_id, user_type, params, function () {
                    callback(usersession);
                });
            } else {
                var params = {
                    token: usersession,
                    user_id: user_id,
                    user_type: user_type,
                };
                Validate.addDeviceInformation(params, function () {
                    callback(usersession);
                });
            }
        });
    },

    /**
     * Function to check device information of any users
     * 14-06-2021
     * @param {Login User ID} user_id 
     * @param {Function} callback 
     */
    checkDeviceInfo: function (user_id, user_type, callback) {

        con.query("SELECT * FROM tbl_user_deviceinfo WHERE user_id = '" + user_id + "' AND user_type='"+user_type+"' ", function (err, result) {
            if (!err && result[0] != undefined) {
                callback(result[0]);
            } else {
                callback(null, err);
            }
        });
    },

    /**
     * Function to update device information of any users
     * 14-06-2021
     * @param {Login User ID} user_id      
     * @param {Parameters} params 
     * @param {Function} callback 
     */
    updateDeviceInfo: function (user_id, user_type, params, callback) {
        
        con.query("UPDATE tbl_user_deviceinfo SET ? WHERE user_id = '" + user_id + "' AND user_type='"+user_type+"' ", params, function (err, result, fields) {
            callback(result);
        });
    },

    /**
     * Add Device Information for users
     * 14-06-2021
     * @param {Parameters} params 
     * @param {Function} callback 
     */
    addDeviceInformation: function (params, callback) {
        con.query('INSERT INTO tbl_user_deviceinfo SET ?', params, function (err, result, fields) {
            callback(result.insertId);
        });
    },

    /**
     * Function to check and update device information
     * 14-06-2021
     * @param {Login User ID} user_id      
     * @param {Parameters} params 
     * @param {Function} callback 
     */
    checkUpdateDeviceInfo: function (user_id, user_type, params, callback) {

        var upd_device = {
            uuid: (params.uuid != undefined) ? params.uuid : "",
            ip: (params.ip != undefined) ? params.ip : "",
            os_version: (params.os_version != undefined) ? params.os_version : "",
            model_name: (params.model_name != undefined) ? params.model_name : "",
            device_type: params.device_type,
            device_token: params.device_token,
        };

        Validate.checkDeviceInfo(user_id, user_type, function (DeviceInfo, Error) {
            if (DeviceInfo != null) {
                Validate.updateDeviceInfo(user_id, user_type, upd_device, function (result, error) {
                    callback(result);
                });
            } else {
                upd_device.user_id = user_id;
                upd_device.user_type = user_type;
                Validate.addDeviceInformation(upd_device, function (result, error) {
                    callback(result);
                });
            }
        });
    },

    /*
     ** Common function to send sms
     ** 14-06-2021
     */
    sendSMS: function (phone, message, callback) {
        if (phone != '' && phone != undefined) {
            callback(true);
        } else {
            callback(false);
        }
    },

    /*
     ** Random otp generator
     ** 14-06-2021 
     */
    random: function (callback) {
        var gen = require('random-number').generator({
            min: 1000,
            max: 9999,
            integer: true
        })
        callback(gen());
    },

    /**
     * Function to generate random otp
     * 14-06-2021
     */
    randomOtpGenerator: function () {
        // return Math.floor(1000 + Math.random() * 9000);
        return '1234';
    },

    getAccountCode: function () {
        return 'Training-' + Math.floor(1000 + Math.random() * 9000);
    },

    /**
     * Function to check if any object is empty or not
     * 14-06-2021
     * @param {Object} obj 
     */
    isEmptyObject: function(obj){
        return !Object.keys(obj).length;
    },

    /**
     * Function to send email to users
     * @param {subject} subject 
     * @param {to email} to_email 
     * @param {message} message 
     * @param {Function} callback 
     */
    send_email: function (subject, to_email, message, callback) {
        
        var transporter = require('nodemailer').createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: GLOBALS.EMAIL_ID,
                pass: GLOBALS.EMAIL_PASSWORD
            }
        });
        var mailOptions = {
            from: GLOBALS.EMAIL_ID,
            to: to_email,
            subject: subject,
            html: message
        };
        transporter.sendMail(mailOptions, (error, info) => {
            console.log(error)
            if (error) {
                callback(false);
            } else {
                callback(true);
            }
        });
    },

    /**
     * FUnction to generate order ID for training
     * @param {User ID} user_id 
     * @param {Function} callback 
     */
     trainingOrderID:function(user_id){
        var sharecode = "Training"+user_id+Math.floor(100000000 + Math.random() * 999999999);
        return sharecode;
    },
}
module.exports = Validate;