// Importing libraries
var express = require("express");
var middleware = require("../../../middleware/headerValidator");
var GLOBALS = require("../../../config/constants");
var common = require("../../../config/common");
var user_model = require("./user_model");
var asyncLoop = require("node-async-loop");
var router = express.Router();

// Router for signup
router.post("/signup", function (req, res) {
  middleware.decryption(req.body, function (request) {
    // console.log(req.body);
    var rules = {
      login_type: "required|in:S,F,G,T,A",
      social_id: "required_unless:login_type,S",
      full_name: "required",
      country_code: "required",
      phone: "required",
      email: "required|email",
      password: "required_if:login_type,S",
      device_type: "required|in:A,I",
      device_token: "required",
    };

    // checks all validation rules defined above and if error send back response
    if (middleware.checkValidationRules(request, res, rules, {})) {
      user_model.signUpUsers(
        request,
        function (responsecode, responsemsg, responsedata) {
          middleware.sendresponse(
            req,
            res,
            200,
            responsecode,
            responsemsg,
            responsedata
          );
        }
      );
    }
  });
});

// Router for Login
router.post("/login", function (req, res) {
  middleware.decryption(req.body, function (request) {
    var request = request;
    var rules = {
      login_type: "required|in:S,F,G,T,A",
      device_token: "required",
      device_type: "required|in:A,I",
      email: "required_if:login_type,S",
      social_id: "required_unless:login_type,S",
      password: "required_unless:login_type,F,G,T,A",
    };

    const messages = {
      required: req.language.required,
      email: req.language.email,
      in: req.language.in,
      required_if: req.language.required_if,
      required_unless: req.language.required_unless,
    };

    // checks all validation rules defined above and if error send back response
    if (middleware.checkValidationRules(request, res, rules, messages, {})) {
      user_model.checkLogin(
        request,
        function (responsecode, responsemsg, responsedata) {
          middleware.sendresponse(
            req,
            res,
            200,
            responsecode,
            responsemsg,
            responsedata
          );
        }
      );
    }
  });
});

// Router for getting user details
router.post("/userdetails", function (req, res) {
  user_model.userdetails(req.user_id, function (userProfile) {
    if (userProfile != null) {
      middleware.sendresponse(
        req,
        res,
        200,
        "1",
        {
          keyword: "rest_keywords_user_data_successfound",
          components: {},
        },
        userProfile
      );
    } else {
      middleware.sendresponse(
        req,
        res,
        200,
        "0",
        {
          keyword: "rest_keywords_userdetailsnot_found",
          components: {},
        },
        null
      );
    }
  });
});

// Router for forgot password
router.post("/forgotpassword", function (req, res) {
  middleware.decryption(req.body, function (request) {
    var request = request;
    var rules = {
      email: "required|email",
    };

    const messages = {
      required: req.language.required,
      email: req.language.email,
    };

    // checks all validation rules defined above and if error send back response
    if (middleware.checkValidationRules(request, res, rules, messages, {})) {
      user_model.forgotPassword(
        request,
        function (responsecode, responsemsg, responsedata) {
          middleware.sendresponse(
            req,
            res,
            200,
            responsecode,
            responsemsg,
            responsedata
          );
        }
      );
    }
  });
});

//Router for otp verification
router.post("/otp", function (req, res) {
  // console.log(req.body);
  // return
  middleware.decryption(req.body, function (request) {
    var rules = {
      otp: "required",
    };
    // checks all validation rules defined above and if error send back response
    if (middleware.checkValidationRules(request, res, rules, {})) {
      user_model.otp(
        req.user_id,
        request,
        function (responsecode, responsemsg, responsedata) {
          middleware.sendresponse(
            req,
            res,
            200,
            responsecode,
            responsemsg,
            responsedata
          );
        }
      );
    }
  });
});

// Router for dish listing
router.post("/dish_listing", function (req, res) {
  user_model.dish_listing(req.body, function (response) {
    if (response != null) {
      middleware.sendresponse(
        req,
        res,
        200,
        "1",
        {
          keyword: "rest_keywords_dish_data_successfound",
          components: {},
        },
        response
      );
    } else {
      middleware.sendresponse(
        req,
        res,
        200,
        "0",
        {
          keyword: "rest_keywords_dishdetailsnot_found",
          components: {},
        },
        null
      );
    }
  });
});

// Router for logout
router.post("/logout", function (req, res) {
  var updusers = {
    login_status: "Offline",
  };
  user_model.update_customer(
    req.user_id,
    updusers,
    function (userprofile, error) {
      if (userprofile != null) {
        var deviceparam = {
          token: "",
          device_token: "",
        };
        common.updateDeviceInfo(
          req.user_id,
          "Customer",
          deviceparam,
          function (respond) {
            middleware.sendresponse(
              req,
              res,
              200,
              "1",
              {
                keyword: "rest_keywords_userlogout_success",
                components: {},
              },
              null
            );
          }
        );
      } else {
        middleware.sendresponse(
          req,
          res,
          200,
          "0",
          {
            keyword: "rest_keywords_something_went_wrong",
            components: {},
          },
          null
        );
      }
    }
  );
});

router.post("/order_place", function (req, res) {
  middleware.decryption(req.body, function (request) {
    // console.log(request);
    // return/
    console.log(req.user_id);
    user_model.order_place(req.user_id,request, function (userProfile) {
      if (userProfile != null) {
        middleware.sendresponse(req,res,200,"1",{
            keyword: "rest_keywords_dish_data_successfound",
            components: {},
          },
          userProfile
        );
      } else {
        middleware.sendresponse(req,res,200,"0",{
            keyword: "rest_keywords_dishdetailsnot_found",
            components: {},
          },null);
      }
    });
  });
});

router.post("/restaurant_list", function(req,res){
    middleware.decryption(req.body, function (request) {
        console.log(request);
        // return/
        user_model.restaurant_list(request, function (userProfile) {
          if (userProfile != null) {
            middleware.sendresponse(
              req,
              res,
              200,
              "1",
              {
                keyword: "rest_keywords_success",
                components: {},
              },
              userProfile
            );
          } else {
            middleware.sendresponse(
              req,
              res,
              200,
              "0",
              {
                keyword: "rest_keywords_nodata",
                components: {},
              },
              null
            );
          }
        });
      });
});

router.post("/list_of_dish", function(req,res){
    middleware.decryption(req.body, function (request) {
        console.log(request);
        // return/
        user_model.list_of_dish(request, function (userProfile) {
          if (userProfile != null) {
            middleware.sendresponse(
              req,
              res,
              200,
              "1",
              {
                keyword: "rest_keywords_success",
                components: {},
              },
              userProfile
            );
          } else {
            middleware.sendresponse(
              req,
              res,
              200,
              "0",
              {
                keyword: "rest_keywords_nodata",
                components: {},
              },
              null
            );
          }
        });
      });
});
//Like
router.post("/add_like", function (req, res) {

  middleware.decryption(req.body, function (request) {

      var request = request

      // var rules = {
      //     dish_id: "required"
      // }
      // const messages = {
      //     'required': req.language.required,
      // }

      // checks all validation rules defined above and if error send back response
      // if (middleware.checkValidationRules(request, res, rules, messages, {})) {
          user_model.add_like(req.user_id,request, function (responsecode, responsemsg, responsedata) {
              // middleware.sendresponse(req, res, 200, responsecode, responsemsg, responsedata);
          });
      // }
  });
});

module.exports = router;
