var express = require("express");
var app = express();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var multer = require('multer'),
  bodyParser = require('body-parser'),
  path = require('path');
var mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1/loginDB");
var fs = require('fs');
var product = require("./model/product.js");
var user = require("./model/user.js");
var ad = require("./model/ad.js");

const crypto = require('crypto');
const parameters = require('./config').parameters;
const bigInt = require("big-integer");

const fastcsv = require("fast-csv");

var dir = './uploads';
var upload = multer({
  storage: multer.diskStorage({

    destination: function (req, file, callback) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      callback(null, './uploads');
    },
    filename: function (req, file, callback) { callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); }

  }),

  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname)
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
      return callback(/*res.end('Only images are allowed')*/ null, false)
    }
    callback(null, true)
  }
});
app.use(cors());
app.use(express.static('uploads'));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: false
}));

app.use("/", (req, res, next) => {
  try {
    next();
    // if (req.path == "/login" || req.path == '/authenticate' || req.path == "/register" || req.path == "/") {
    //   next();
    // } else {
    //   /* decode jwt token if authorized*/
    //   jwt.verify(req.headers.token, 'shhhhh11111', function (err, decoded) {
    //     if (decoded && decoded.user) {
    //       req.user = decoded;
    //       next();
    //     } else {
    //       return res.status(401).json({
    //         errorMessage: 'User unauthorized!',
    //         status: false
    //       });
    //     }
    //   })
    // }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }
})

app.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    title: 'Apis'
  });
});

/* login api */
app.post("/login", (req, res) => {
  try {
    if (req.body && req.body.username && req.body.A) {
      user.findOne({ username: req.body.username }, (err, data) => {
        if (data) {
          let A = req.body.A;
          let v = bigInt(data.verifier);

          let b = bigInt("7"); //random b
          let B = parameters.SRP.g.modPow(b, parameters.SRP.N).add(parameters.SRP.k.multiply(v)).mod(parameters.N); // B = g^b mod N + kv mod N
          
          let H = crypto.createHash('sha256');
          H.update(A.toString() + B.toString());

           // u = hash(A + B)
          let u = bigInt(`${H.digest().toString('hex')}`, 16);;

          let S = v.modPow(u, parameters.SRP.N).multiply(A).modPow(b, parameters.SRP.N) // S = v^u mod N * A^b mod N

          H = crypto.createHash('sha256');
          H.update(S.toString());
          let K = bigInt(`${H.digest().toString('hex')}`, 16);

          data.K = K;
          data.b = b;
          data.save((err, data) => {
            if (err) {
              res.status(400).json({
                errorMessage: err,
                status: false
              });
            } else {
              res.status(200).json({
                salt: data.salt,
                B: B.toString(),
                status: true
              });
            }
          });
        } else {
          res.status(400).json({
            errorMessage: 'Username is incorrect.',
            status: false
          });
        }
      })
    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameters.',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong.',
      status: false
    });
  }
});

app.post("/authenticate", (req, res) => {
  try {
    if (req.body && req.body.username && req.body.A && req.body.M) {
      user.findOne({ username: req.body.username }, (err, data) => {
        if (data) {
          let A = req.body.A;
          let M = bigInt(req.body.M);
          let v = bigInt(data.verifier);

          let b = data.b;
          let s = data.salt;
          let K = data.K;
          let B = parameters.SRP.g.modPow(b, parameters.SRP.N).add(parameters.SRP.k.multiply(v)).mod(parameters.N); // B = g*b mod N + k.v mod N

          let H = crypto.createHash('sha256');
          H.update(parameters.SRP.N.toString());
          let HN = bigInt(`${H.digest().toString('hex')}`, 16);

          H = crypto.createHash('sha256');
          H.update(parameters.SRP.g.toString());
          let Hg = bigInt(`${H.digest().toString('hex')}`, 16);

          H = crypto.createHash('sha256');
          H.update(req.body.username);
          let HI = bigInt(`${H.digest().toString('hex')}`, 16);
          
          H = crypto.createHash('sha256');
          H.update(HN.xor(Hg).toString() + HI.toString() + s + A + B.toString() + K);
          let check = bigInt(`${H.digest().toString('hex')}`, 16); // check = hash( XOR(HN,Hg) + HI + s + A + B + K)

          if(check.compare(M) == 0){
            H = crypto.createHash('sha256');
            H.update(A + M.toString() + K);
            let M2 = bigInt(`${H.digest().toString('hex')}`, 16); // M2 = hash(A + M + K)

            res.status(200).json({
              title: 'Authentication succeeded.',
              M: M2.toString(),
              status: true
            });
          } else {
            res.status(400).json({
              errorMessage: 'Authentication failed.',
              M: check,
              status: false
            });
          }
        } else {
          res.status(400).json({
            errorMessage: 'Username is not found.',
            status: false
          });
        }
      })
    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameters.',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong.',
      status: false
    });
  }
});

/* register api */
app.post("/register", (req, res) => {
  try {
    if (req.body && req.body.username && req.body.salt && req.body.verifier) {
      user.find({ username: req.body.username }, (err, data) => {
        if (data.length == 0) {
          let User = new user({
            username: req.body.username,
            salt: req.body.salt,
            verifier: req.body.verifier
          });

          User.save((err, data) => {
            if (err) {
              res.status(400).json({
                errorMessage: err,
                status: false
              });
            } else {
              res.status(200).json({
                status: true,
                title: 'Registered successfully.'
              });
            }
          });

        } else {
          res.status(400).json({
            errorMessage: `Username ${req.body.username} already exists.`,
            status: false
          });
        }

      });

    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameters.',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong.',
      status: false
    });
  }
});

app.post("/get-ad-commitments", (req, res) => {
  try {
    ad.distinct('product_type', (err, data) => {
      let length = data.length;
      let x = [];
      for(let i = 0; i < length; i++) {
        let randomValue = crypto.randomBytes(64);
        x.push(bigInt(`${randomValue.toString('hex')}`, 16).toString());
      }

      res.status(200).json({
        status: true,
        x: x
      });
      
    });

  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong.',
      status: false
    });
  }
});

app.post("/get-ads", (req, res) => {
  try {
    ad.aggregate([
      {
        $group: {
          _id: "$product_type",
          obj: { $push: {year: "$year", title: "$title", notes: "$notes"}}
        }
      }
    ], (err, data) => {
      let adData = [];
      for(let i = 0; i < data.length; i++) {
        adData.push(Buffer.from(JSON.stringify(data[i].obj)).toString('hex'));
      }

      let length = adData.length;

      let v = bigInt(req.body.v);
      let x = [];
      for(let i = 0; i < req.body.x.length; i++) {
        x.push(bigInt(req.body.x[i]));
      }

      let m = [];
      for(let i = 0; i < length; i++) {
        let k = v.subtract(bigInt(x[i])).modPow(parameters.OT.d, parameters.OT.N);
        m.push(bigInt(adData[i], 16).add(k).toString());
      }

      res.status(200).json({
        status: true,
        m: m
      });
    });

  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong.',
      status: false
    });
  }
});

function checkUserAndGenerateToken(data, req, res) {
  jwt.sign({ user: data.username, id: data._id }, 'shhhhh11111', { expiresIn: '1d' }, (err, token) => {
    if (err) {
      res.status(400).json({
        status: false,
        errorMessage: err,
      });
    } else {
      res.json({
        message: 'Login Successfully.',
        token: token,
        status: true
      });
    }
  });
}

/* Api to add Product */
app.post("/add-product", upload.any(), (req, res) => {
  try {
    if (req.files && req.body && req.body.name && req.body.desc && req.body.price &&
      req.body.discount) {

      let new_product = new product();
      new_product.name = req.body.name;
      new_product.desc = req.body.desc;
      new_product.price = req.body.price;
      new_product.image = req.files[0].filename;
      new_product.discount = req.body.discount;
      new_product.user_id = req.user.id;
      new_product.save((err, data) => {
        if (err) {
          res.status(400).json({
            errorMessage: err,
            status: false
          });
        } else {
          res.status(200).json({
            status: true,
            title: 'Product Added successfully.'
          });
        }
      });

    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameter first!',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }
});

/* Api to update Product */
app.post("/update-product", upload.any(), (req, res) => {
  try {
    if (req.files && req.body && req.body.name && req.body.desc && req.body.price &&
      req.body.id && req.body.discount) {

      product.findById(req.body.id, (err, new_product) => {

        // if file already exist than remove it
        if (req.files && req.files[0] && req.files[0].filename && new_product.image) {
          var path = `./uploads/${new_product.image}`;
          fs.unlinkSync(path);
        }

        if (req.files && req.files[0] && req.files[0].filename) {
          new_product.image = req.files[0].filename;
        }
        if (req.body.name) {
          new_product.name = req.body.name;
        }
        if (req.body.desc) {
          new_product.desc = req.body.desc;
        }
        if (req.body.price) {
          new_product.price = req.body.price;
        }
        if (req.body.discount) {
          new_product.discount = req.body.discount;
        }

        new_product.save((err, data) => {
          if (err) {
            res.status(400).json({
              errorMessage: err,
              status: false
            });
          } else {
            res.status(200).json({
              status: true,
              title: 'Product updated.'
            });
          }
        });

      });

    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameter first!',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }
});

/* Api to delete Product */
app.post("/delete-product", (req, res) => {
  try {
    if (req.body && req.body.id) {
      product.findByIdAndUpdate(req.body.id, { is_delete: true }, { new: true }, (err, data) => {
        if (data.is_delete) {
          res.status(200).json({
            status: true,
            title: 'Product deleted.'
          });
        } else {
          res.status(400).json({
            errorMessage: err,
            status: false
          });
        }
      });
    } else {
      res.status(400).json({
        errorMessage: 'Add proper parameter first!',
        status: false
      });
    }
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }
});

/*Api to get all ad types*/
app.get("/get-types", (req, res) => {
  try {
    adTypes = new Set();
    adtypes = [];
    ad.find({}, '-_id product_type')
      .then((data) => {
        for(let i = 0; i < data.length; i++){
          adTypes.add(data[i].product_type)
        }

        // List all Values
        for (const x of adTypes.values()) {
          adtypes.push(x);
        }
        res.status(200).json({
          status: true,
          adTypes: adtypes
        })
      }).catch(err => {
        res.status(400).json({
          errorMessage: err.message || err,
          status: false
        });
      });
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }

});

/*Api to get and search product with pagination and search by name*/
app.get("/get-product", (req, res) => {
  try {
    var query = {};
    query["$and"] = [];
    query["$and"].push({
      is_delete: false,
      user_id: req.user.id
    });
    if (req.query && req.query.search) {
      query["$and"].push({
        name: { $regex: req.query.search }
      });
    }
    var perPage = 5;
    var page = req.query.page || 1;
    product.find(query, { date: 1, name: 1, id: 1, desc: 1, price: 1, discount: 1, image: 1 })
      .skip((perPage * page) - perPage).limit(perPage)
      .then((data) => {
        product.find(query).count()
          .then((count) => {

            if (data && data.length > 0) {
              res.status(200).json({
                status: true,
                title: 'Product retrived.',
                products: data,
                current_page: page,
                total: count,
                pages: Math.ceil(count / perPage),
              });
            } else {
              res.status(400).json({
                errorMessage: 'There is no product!',
                status: false
              });
            }

          });

      }).catch(err => {
        res.status(400).json({
          errorMessage: err.message || err,
          status: false
        });
      });
  } catch (e) {
    res.status(400).json({
      errorMessage: 'Something went wrong!',
      status: false
    });
  }

});

function initializeAdsFromCSV(){
  // Check is DB is already initialized
  ad.countDocuments({}, function (err, count) {
    if (err){
        console.log(err)
    }else{
        // Add to DB if Ad collection is empty
        if (count == 0){
          let stream = fs.createReadStream("../dataset/superbowl-ads.csv");
          let row = 0;
          let csvStream = fastcsv
            .parse()
            .on("data", function(data) {
              row++;
              if(row != 1){ // avoid adding header into DB
                let new_ad = new ad();
                new_ad.year = data[0];
                new_ad.product_type = data[1];
                new_ad.title = data[2];
                new_ad.notes = data[3];
                new_ad.id = 0; // assign cohortID later
                new_ad.save((err, data) => {
                  if (err) {
                    console.log("err:"+err);
                    console.log("error:"+JSON.stringify(new_ad));
                  } 
                });
              }
            })
          stream.pipe(csvStream);
        }
    }
  });  
}

app.listen(2000, () => {
  console.log("Server is Runing On port 2000");
  initializeAdsFromCSV();
});
