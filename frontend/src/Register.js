import React from 'react';
import swal from 'sweetalert';
import { Button, TextField, Link } from '@material-ui/core';
const crypto = require('crypto');
const axios = require('axios');
const bigInt = require("big-integer");
const parameters = require('./config').parameters;

export default class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      confirm_password: ''
    };
  }

  onChange = (e) => this.setState({ [e.target.name]: e.target.value });
  register = () => {
    // random salt
    let saltBytes = crypto.randomBytes(64) 
    let salt = bigInt(`${saltBytes.toString('hex')}`, 16);

    // create x = hash(pwd + salt)
    let H = crypto.createHash('sha256'); 
    H.update(this.state.password + salt.toString());
    let x = bigInt(`${H.digest().toString('hex')}`, 16);

    // create verifier v = g^x
    let v = parameters.g.modPow(x, parameters.N);
    console.log("f: username=", this.state.username, ", s=", salt.toString, ", v=", v.toString)

    axios.post('http://localhost:2000/register', {
      username: this.state.username,
      salt: salt.toString(),
      verifier: v.toString(),
    }).then((res) => {
      swal({
        text: res.data.title,
        icon: "success",
        type: "success"
      });
      this.props.history.push('/');
    }).catch((err) => {
      swal({
        text: err.response.data.errorMessage,
        icon: "error",
        type: "error"
      });
    });
  }

  render() {
    return (
      <div style={{ marginTop: '200px' }}>
        <div>
          <h2>Register</h2>
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
          <TextField
            id="standard-basic"
            type="password"
            autoComplete="off"
            name="confirm_password"
            value={this.state.confirm_password}
            onChange={this.onChange}
            placeholder="Confirm Password"
            required
          />
          <br /><br />
          <Button
            className="button_style"
            variant="contained"
            color="primary"
            size="small"
            disabled={this.state.username ==='' && this.state.password === ''}
            onClick={this.register}
          >
            Register
          </Button> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <Link href="/">
            Login
          </Link>
        </div>
      </div>
    );
  }
}
