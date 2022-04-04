import React from 'react';
import swal from 'sweetalert';
import { Button, TextField, Link } from '@material-ui/core';
import { cohortValue } from './helper/cohort';
const axios = require('axios');
// const bcrypt = require('bcryptjs');
// var salt = bcrypt.genSaltSync(10);

const crypto = require('crypto');
const parameters = require('./config').parameters;
const bigInt = require("big-integer");

cohortValue()

export default class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: ''
    };
  }

  onChange = (e) => this.setState({ [e.target.name]: e.target.value });

  login = () => {
    const password = this.state.password;
    let a = bigInt("10"); // random a
    let A = parameters.SRP.g.modPow(a, parameters.SRP.N); // A = g^a mod N
    
    axios.post('http://localhost:2000/login', {
      username: this.state.username,
      A: A.toString(),
    }).then((res) => {
      let B = bigInt(res.data.B);
      let s = bigInt(res.data.salt);

      let H = crypto.createHash('sha256');
      H.update(A.toString() + B.toString());
      let u = bigInt(`${H.digest().toString('hex')}`, 16); // u = hash(A + B)

      H = crypto.createHash('sha256');
      H.update(password + s.toString());
      let x = bigInt(`${H.digest().toString('hex')}`, 16); // x = hash(pwd + salt)

      let exp = u.multiply(x).add(a); // exp = u.x + a
      let base = parameters.SRP.g.modPow(x, parameters.SRP.N).multiply(parameters.SRP.k); // base = g^x mod N * k
      let S = B.subtract(base).modPow(exp, parameters.SRP.N); // S = B - base*exp mod N

      H = crypto.createHash('sha256');
      H.update(S.toString());
      let K = bigInt(`${H.digest().toString('hex')}`, 16);

      H = crypto.createHash('sha256');
      H.update(parameters.SRP.N.toString());
      let HN = bigInt(`${H.digest().toString('hex')}`, 16);

      H = crypto.createHash('sha256');
      H.update(parameters.SRP.g.toString());
      let Hg = bigInt(`${H.digest().toString('hex')}`, 16);
    
      H = crypto.createHash('sha256');
      H.update(this.state.username);
      let HI = bigInt(`${H.digest().toString('hex')}`, 16);

      H = crypto.createHash('sha256');
      H.update(HN.xor(Hg).toString() + HI.toString() + s.toString() + A.toString() + B.toString() + K.toString());
      let M = bigInt(`${H.digest().toString('hex')}`, 16); // M = hash( XOR(HN,Hg) + HI + S + A + B + K)
      
      axios.post('http://localhost:2000/authenticate', {
      username: this.state.username,
        A: A.toString(),
        M: M.toString(),
    }).then((res) => {
        let M2 = res.data.M;

        H = crypto.createHash('sha256');
        H.update(A.toString() + M.toString() + K.toString());
        let check = bigInt(`${H.digest().toString('hex')}`, 16);

        if(check.compare(M2) === 0){
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_id', res.data.id);
      this.props.history.push('/dashboard');
        } else {
          swal({
            icon: "error",
            type: "error"
          });
        }
      }).catch((err) => {
        if (err.response && err.response.data && err.response.data.errorMessage) {
          swal({
            text: err.response.data.errorMessage,
            icon: "error",
            type: "error"
          });
        }
      });
    }).catch((err) => {
      if (err.response && err.response.data && err.response.data.errorMessage) {
        swal({
          text: err.response.data.errorMessage,
          icon: "error",
          type: "error"
        });
      }
    });
  }

  render() {
    return (
      <div style={{ marginTop: '200px' }}>
        <div>
          <h2>Login</h2>
        </div>

        <div>
          <TextField
            id="standard-basic"
            type="text"
            autoComplete="off"
            name="username"
            value={this.state.username}
            onChange={this.onChange}
            placeholder="User Name"
            required
          />
          <br /><br />
          <TextField
            id="standard-basic"
            type="password"
            autoComplete="off"
            name="password"
            value={this.state.password}
            onChange={this.onChange}
            placeholder="Password"
            required
          />
          <br /><br />
          <Button
            className="button_style"
            variant="contained"
            color="primary"
            size="small"
            disabled={this.state.username === '' && this.state.password === ''}
            onClick={this.login}
          >
            Login
          </Button> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <Link href="/register">
            Register
          </Link>
        </div>
      </div>
    );
  }
}
