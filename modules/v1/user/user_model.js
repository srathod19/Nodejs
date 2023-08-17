var con = require('../../../config/database');
var GLOBALS = require('../../../config/constants');
var common = require('../../../config/common');
var middleware = require('../../../middleware/headerValidator');
var cryptoLib = require('cryptlib');
var asyncLoop = require('node-async-loop');
var moment = require('moment');
var shaKey = cryptoLib.getHashSha256(GLOBALS.KEY, 32);
var emailTemplate = require('../../../config/template');
var generator = require('generate-password');
const { exists } = require('../../../languages/en');

var User = {

    // Model for getting user details
    userdetails: function (user_id, callback) {
    console.log(user_id);
    con.query("SELECT u.*,concat('" + GLOBALS.S3_BUCKET_ROOT + GLOBALS.USER_IMAGE + "','',u.profile_image) as profile_image,IFNULL(ut.device_token,'') as device_token,IFNULL(ut.device_type,'') as device_type,IFNULL(ut.token,'') as token FROM tbl_user u LEFT JOIN tbl_user_deviceinfo as ut ON u.user_id = ut.user_id AND ut.user_type='Customer' WHERE u.user_id = '" + user_id + "' AND u.is_deleted='0' GROUP BY u.user_id", function (err, result, fields) {
        if (!err && result.length > 0) {
                callback(result[0]);
            } else {
                callback(null);
            }
        });
    },
    // Set of Model for checking unique fields 
    checkUniqueFields: function (user_id, request, callback) {

        // Check in database for this email register
        User.checkUniqueEmail(user_id, request, function (emailcode, emailmsg, emailUnique) {
            
        // console.log(user_id);
        // console.log('1');
        // process.exit();
            if (emailUnique) {
                User.checkUniquePhone(user_id, request, function (phonecode, phonemsg, phoneUnique) {
                    if (phoneUnique) {
                        User.checkUniqueSocialID(user_id, request, function (socialcode, socialmsg, socialUnique) {
                            callback(socialcode, socialmsg, socialUnique);
                        });
                    } else {
                        callback(phonecode, phonemsg, phoneUnique);
                    }
                });
            } else {
                callback(emailcode, emailmsg, emailUnique);
            }
        });
    },

    // Checking whether email is already exists or not
    checkUniqueEmail: function (user_id, request, callback) {

        if (request.email != undefined && request.email != '') {

            if (user_id != undefined && user_id != '') {
                var uniqueEmail = "SELECT * FROM tbl_user WHERE email = '" + request.email + "' AND is_deleted='0' AND user_id != '" + user_id + "' ";
            } else {
                var uniqueEmail = "SELECT * FROM tbl_user WHERE email = '" + request.email + "' AND is_deleted='0' ";
            }
            con.query(uniqueEmail, function (error, result, fields) {
                if (!error && result[0] != undefined) {
                    callback('0', {
                        keyword: 'rest_keywords_duplicate_email',
                        components: {}
                    }, false);
                } else {
                    callback('1', "Success", true);
                }
            });

        } else {
            callback('1', "Success", true);
        }
    },

    // Checking whether phone is already exists or not
    checkUniquePhone: function (user_id, request, callback) {
        if ((request.country_code != undefined && request.country_code != '') && (request.phone != undefined && request.phone != '')) {

            if (user_id != undefined && user_id != '') {
                var uniquePhone = "SELECT * FROM tbl_user WHERE phone = '" + request.phone + "' AND is_deleted='0' AND id != '" + user_id + "' ";
            } else {
                var uniquePhone = "SELECT * FROM tbl_user WHERE phone = '" + request.phone + "' AND is_deleted='0' ";
            }

            // Check database for this phone number registered
            con.query(uniquePhone, function (error, result, fields) {
                if (!error && result[0] != undefined) {
                    callback('0', {
                        keyword: 'rest_keywords_duplicate_phonenumber',
                        components: {}
                    }, false);
                } else {
                    callback('1', "Success", true);
                }
            });
        } else {
            callback('1', "Success", true);
        }
    },
    
    // Checking whether social id is already exists or not
    checkUniqueSocialID: function (user_id, request, callback) {
        if ((request.social_id != undefined && request.social_id != '')) {

            if (user_id != undefined && user_id != '') {
                var uniqueSocial = "SELECT * FROM tbl_user WHERE social_id = '" + request.social_id + "' AND is_deleted='0' AND id != '" + user_id + "' ";
            } else {
                var uniqueSocial = "SELECT * FROM tbl_user WHERE social_id = '" + request.social_id + "' AND is_deleted='0' ";
            }

            // Check database for this social_id number registered
            con.query(uniqueSocial, function (error, result, fields) {
                if (!error && result[0] != undefined) {
                    callback('0', {
                        keyword: 'rest_keywords_duplicate_social_id',
                        components: {}
                    }, false);
                } else {
                    callback('1', "Success", true);
                }
            });
        } else {
            callback('1', "Success", true);
        }
    },

    // Model for updating user/customer details
    update_customer: function (user_id, upd_params, callback) {
           
        con.query("UPDATE tbl_user SET ? WHERE user_id = ? ", [upd_params, user_id], function (err, result, fields) {
            if (!err) {
                User.userdetails(user_id, function (response, err) {
                    callback(response);
                });
            } else {
                callback(null, err);
            }
        });
    
    },
// -------------------------------------------------------------------
    // Model for registering user
    signUpUsers: function (request, callback) {
        User.checkUniqueFields('', request, function (uniquecode, uniquemsg, isUnique) {
            if (isUnique) {
                // con.query("SELECT user_id,full_name,email FROM tbl_user", function (error, result, fields) {
                    // console.log(error);
                    // console.log(result[0]);
                    var customer = {
                        login_type: request.login_type,
                        social_id: (request.social_id != undefined && request.social_id != "") ? request.social_id : '',
                        full_name: request.full_name,
                        country_code: request.country_code,
                        phone: request.phone,
                        email: request.email,
                        location: (request.location != undefined && request.location != "") ? request.location : '',
                        latitude: (request.latitude != undefined && request.latitude != "") ? request.latitude : '',
                        longitude: (request.longitude != undefined && request.longitude != "") ? request.longitude : '',
                        status: 'Active',
                        is_active:'1',  
                        login_status: 'Offline',
                        email_verify: 'Pending',
                        profile_image: 'default.png',
                        // currency_code: (result[0].currency_code != undefined) ? result[0].currency_code : 'QAR',
                    };
                    console.log(customer);
                    if (request.login_type === 'S') {
                        customer.password = cryptoLib.encrypt(request.password, shaKey, GLOBALS.IV);
                    }

                    con.query('INSERT INTO tbl_user SET ?', customer, function (err, result, fields) {
                        console.log(err);
                        if (!err) {
                            console.log("result");
                            console.log(result.insertId);
                            common.checkUpdateDeviceInfo(result.insertId, "Customer", request, function () {

                                User.userdetails(result.insertId, function (userprofile, err) {

                                    request.url = GLOBALS.BASE_URL_WITHOUT_API + "home/verifyemail/" + Buffer.from("Customer").toString('base64') + '/' + Buffer.from(userprofile.user_id.toString()).toString('base64');
                                    common.generateSessionCode(result.insertId, "Customer", function (Token) {
                                        // userprofile.token = Token;
                                    emailTemplate.verifyEmail(request, function (verifytemplate) {
                                        common.send_email("Verify Email", request.email, verifytemplate, function (isSend) {

                                            callback('1', {
                                                keyword: 'rest_keywords_user_signup_success',
                                                components: {}
                                            }, userprofile);
                                            });
                                        });
                                    });
                                });
                            });
                        } else {
                            callback('0', {
                                keyword: 'rest_keywords_user_signup_failed',
                                components: {}
                            }, null);
                        }
                    });
                // });
            } else {
                callback(uniquecode, uniquemsg, null);
            }
        });
    },
    // Handling login query
    checkLogin: function (request, callback) {

        var whereCondition = "";
        if (request.login_type === 'S') {
            var whereCondition = " email='" + request.email + "' AND login_type='S' ";
        } else {
            var whereCondition = " social_id = '" + request.social_id + "' AND login_type = '" + request.login_type + "' ";
        }

        con.query("SELECT * FROM tbl_user where " + whereCondition + " AND is_deleted='0' ", function (err, result, fields) {

            console.log('0');
            console.log(err);
            if (!err && result[0] != undefined) {

                User.userdetails(result[0].user_id, function (userprofile) {
                    // console.log(result[0].user_id);
                    // process.exit();
                    var password = (result[0].login_type === 'S') ? cryptoLib.decrypt(result[0].password, shaKey, GLOBALS.IV) : '';
                    if (result[0].status == 'Inactive') {

                        callback('3', {
                            keyword: 'rest_keywords_inactive_accountby_admin',
                            components: {}
                        }, null);

                    } else if (result[0].email_verify == 'pending') {

                        callback('4', {
                            keyword: 'rest_keywords_unverified_emailnumber',
                            components: {}
                        }, null);

                    } else if (result[0].login_type == 'S' && password !== request.password) {

                        callback('0', {
                            keyword: 'rest_keywords_invalid_password',
                            components: {}
                        }, null);

                    } else {

                        var updparams = {
                            login_status: "Online",
                            last_login: require('node-datetime').create().format('Y-m-d H:M:S'),
                            latitude: (request.latitude != undefined) ? request.latitude : '',
                            longitude: (request.longitude != undefined) ? request.longitude : '',
                        }
                        // update device information of user
                        common.checkUpdateDeviceInfo(result[0].user_id, "Customer", request, function () {
                            User.update_customer(result[0].user_id, updparams, function (userprofile, error) {
                                common.generateSessionCode(result[0].user_id, "Customer", function (token) {
                                    // userprofile.token = token;
                                    callback('1', {
                                        keyword: 'rest_keywords_user_login_success',
                                        components: {}
                                    }, result[0]);
                                });
                            });
                        });
                    }
                });
            } else {
                if (request.login_type === 'S') {
                    callback('0', {
                        keyword: 'rest_keywords_invalid_email',
                        components: {}
                    }, null);
                } else {
                    callback('11', {
                        keyword: 'rest_keywords_not_socialregister_user',
                        components: {}
                    }, null);
                }
            }
        });
    },
    // forgot password
    forgotPassword: function (request, callback) {

        con.query("SELECT * FROM tbl_user where email='" + request.email + "' AND is_deleted='0' ", function (err, result, fields) {
            console.log(err);
            // process.exit()
            if (!err & result[0] != undefined) {

                if (result[0].login_type == 'S') {
                    var updparams = {
                        otp:Math.floor(1000 + Math.random() * 9000),
                        forgotpassword_token: GLOBALS.APP_NAME + result[0].user_id,
                        forgotpassword_date: require('node-datetime').create().format('Y-m-d H:M:S')
                    }
                    // console.log(updparams);
                    User.update_customer(result[0].user_id, updparams, function (isupdated) {
                        // process.exit()
                        con.query("SELECT * FROM tbl_user where email='" + request.email + "' AND is_deleted='0' ", function (err, result, fields) {
      
                        // result[0].url = GLOBALS.BASE_URL_WITHOUT_API + "home/forgotpassword/" + Buffer.from("Customer").toString('base64') + '/' + Buffer.from(result[0].id.toString()).toString('base64');
                        emailTemplate.forgot_password(result[0], function (forgotTemplate) {
                            common.send_email("Forgot Password", request.email, forgotTemplate, function (isSend) {
                                if (isSend) {
                                    callback('1', {
                                        keyword: 'rest_keywords_user_forgot_password_success',
                                        components: {}
                                    }, result[0]);
                                } else {
                                    callback('0', {
                                        keyword: 'rest_keywords_user_forgot_password_failed',
                                        components: {}
                                    }, result[0]);
                                }
                            });
                        });
                    });

                    });
                } else {
                    callback('0', {
                        keyword: 'rest_keywords_user_signedup_with_social',
                        components: {}
                    }, null);
                }
            } else {
                callback('0', {
                    keyword: 'rest_keywords_user_doesnot_exist',
                    components: {}
                }, null);
            }
        });
    },
    updated_profile: function (user_id,request, callback){
      
        User.checkUniqueFields('', request, function (uniquecode, uniquemsg, isUnique) {
            if (isUnique) {
                var updparams = {
                    full_name: request.full_name,
                    country_code: request.country_code,
                    phone: request.phone,
                    email: request.email,
                    location: request.location
                };
                
                console.log(updparams);
                
                User.update_customer(user_id, updparams, function (userprofile) {
                
                    if (userprofile == null) {
                        callback('0', {
                            keyword: 'rest_keywords_something_went_wrong',
                            components: {}
                        }, null);
                    } else {
                        callback( '1', {
                            keyword: 'rest_keywords_profile_update_success',
                            components: {}
                        }, userprofile);
                    }
                });
            }else{
                callback(uniquecode, uniquemsg,null);
            }
        })
    },
    // model for otp
    otp: function (user_id,request,callback){
        con.query("SELECT * FROM tbl_user where otp='" + request.otp + "' AND user_id='" + user_id+ "' ", function (err, result, fields) {
            console.log(err);
            // process.exit()
            if (!err & result[0] != undefined) {

                if (result[0].login_type == 'S') {
                    var new_pass = generator.generate({length: 10,numbers: true});
                    var updparams = { 
                        password : cryptoLib.encrypt(new_pass, shaKey, GLOBALS.IV)
                        
                    }
                    // console.log(updparams);
                    User.update_customer(result[0].user_id, updparams, function (isupdated) {

                        // process.exit()
                        // con.query("SELECT * FROM tbl_user where otp='" + request.otp + "' AND is_deleted='0' ", function (err, result, fields) {
      
                        // result[0].url = GLOBALS.BASE_URL_WITHOUT_API + "home/forgotpassword/" + Buffer.from("Customer").toString('base64') + '/' + Buffer.from(result[0].id.toString()).toString('base64');
                        emailTemplate.new_password(new_pass, result[0], function (forgotTemplate) {
                            common.send_email("Forgot Password", result[0].email, forgotTemplate, function (isSend) {
                                if (isSend) {
                                    callback('1', {
                                        keyword: 'rest_keywords_user_forgot_password_success',
                                        components: {}
                                    }, result[0]);
                                } else {
                                    callback('0', {
                                        keyword: 'rest_keywords_user_forgot_password_failed',
                                        components: {}
                                    }, result[0]);
                                }
                            });
                        });
                    // });
                    });
                } else {
                    callback('0', {
                        keyword: 'rest_keywords_user_signedup_with_social',
                        components: {}
                    }, null);
                }
            } else {
                callback('0', {
                    keyword: 'YOur otp is incorrect',
                    components: {}
                }, null);
            }
        });
    },
    // model for dish
    dish_listing: function (request, callback) {
        con.query(`SELECT * FROM tbl_dish`,function (err, result, _fields) {
                 
                if(!err)
                {
                    if(result !="")
                    {
                    asyncLoop(result,function(item,next){
                        User.dish_image_listing({"dish_id":item.dish_id},function(image_listing){
                            item.image_listing = image_listing;
                            next();
                        })
    
                    },function(){
                        callback(result,"Dish listing successfull",1);
    
                    })
                    
                }
                else{
                    callback(null,"No Data Found",0);
                }
            }
                else{
                    callback(null,"Failed",0);
                }
            
            });
    },
    dish_details: function (request, callback) {
        con.query(`SELECT * FROM tbl_dish WHERE dish_id= '${request.dish_id}'`,function (err, result, _fields) {
                 
                if(!err)
                {
                    if(result !="")
                    {
                    asyncLoop(result,function(item,next){
                        User.dish_image_listing({"dish_id":item.dish_id},function(image_listing){
                            item.image_listing = image_listing;
                            next();
                        })
    
                    },function(){
                        callback(result,"Dish Details Display",1);
    
                    })
                    
                }
                else{
                    callback(null,"No Data Found",0);
                }
            }
                else{
                    callback(null,"Failed",0);
                }
            
            });
    },
    dish_image_listing: function (request, callback) {
    
        con.query(`SELECT i.id,i.image FROM tbl_dish_image i  WHERE dish_id=`+request.dish_id+`;`,function (err, result, _fields) {
                console.log(result)
                if(!err)
                {
                    callback(result,"record Display",1);
    
                }else{
                    callback(null,"not record Display",0);
                }
            
            });
    },
    order_place: function(user_id,request,  callback){  
        console.log(user_id);
        // return
        con.query('SELECT * FROM tbl_dish WHERE dish_id= "' + request.dish_id + '"', function (err, result, fields) {
            var dish_id= result[0].dish_id;
            var price= result[0].price;
            var sub_total = request.qty*price;
            var tax = price* 10/100;
            var grand_total = sub_total+tax;

            console.log(this.sql);
            var params={
               'order_no':'Order-' + Math.floor(1000 + Math.random() * 9000),
               'user_id':user_id,
               'dish_id':dish_id,
               'qty':request.qty,
               'price':price,
               'sub_total':sub_total,
               'tax':tax,
               'grand_total':grand_total,
               'status':'pending',
            };
            console.log(params);
            con.query('INSERT INTO tbl_order SET ?',params,function(err,result){
                
            console.log(this.sql);
                callback(result);

            });
        });

    },
   
    restaurant_list: function(request,callback){
        con.query('SELECT * FROM tbl_restaurant', function(err,result){
            callback(result[0])
        })
    },
    list_of_dish:function(request,callback){
        con.query('SELECT * FROM tbl_dish',function(err,result){
            if(result != undefined){
                asyncLoop(result,function(item,next){
                    User.restaurant_list({"restaurant_id":item.restaurant_id},function(restaurant_listing){
                        item.restaurant_listing = restaurant_listing;
                        next();
                    })

                },function(){
                    callback(result,"restaurant listing successfull",1);

                })
            }
            callback(result[0]);
        })
    },
    add_like: function (user_id,request, callback) {
           con.query(`SELECT * FROM tbl_like WHERE user_id ='${user_id}' AND dish_id='${request.dish_id}'`,function(err,result){
               console.log(this.sql);
               console.log(result);
               console.log('id');
            if(result!='' && result!=undefined){
                console.log('result');
                // console.log(result.id);
                // if()
                let like = result[0].is_like == 0 ? 1 : 0;
                con.query(`UPDATE tbl_like  SET is_like ='${like}' WHERE id='${result[0].id}'`, function (err, result, fields) {
                    console.log(this.sql);
                    callback(result);
                })
                // console.log(result);
            }else{
                con.query(`INSERT INTO tbl_like (user_id, dish_id) VALUES ('${user_id}','${request.dish_id}')`, function(err, result){
                    console.log(this.sql);
                    console.log(err);
                    if(!err){
                        callback(result);
                        // console.log(result);
                    }else{
                        callback(result);
                    }
                })
            }

           });
    },
    // for order 
    

}//end block.

module.exports = User;