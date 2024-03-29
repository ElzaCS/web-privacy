import React, { Component } from 'react';
import { Button, TextField, LinearProgress } from '@material-ui/core';
import { Autocomplete, Container, Stack, Paper, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import swal from 'sweetalert';
import { cohortValue, updateCohortValue, dot } from './helper/cohort';
import axios from 'axios';

const crypto = require('crypto');
const parameters = require('./config').parameters;
const bigInt = require("big-integer");

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

export default class Dashboard extends Component {
  constructor() {
    super();
    this.state = {
      token: '',
      search: '',
      adTypes: [],
      searchTags: [],
      loading: false,
      searchDisplay: false,
      searchResults: [],
      adDisplay: false,
      adResults: [],
      cohort: [],
      csvData: [
        ["firstname", "lastname", "email"],
        ["Ahmed", "Tomi", "ah@smthing.co.com"],
        ["Raed", "Labes", "rl@smthing.co.com"],
        ["Yezzi", "Min l3b", "ymin@cocococo.com"]
      ]
    };
  }

  componentDidMount = () => {
    let token = localStorage.getItem('token');
    if (!token) {
      this.props.history.push('/login');
    } else {
      cohortValue().then((cohortID) => {
        this.setState({ token: token, cohort: cohortID }, () => {
          this.getAdTypes();
          this.getAds();
        });
      });
    }
  }

  getAdTypes = () => {
    this.setState({ loading: true });
    axios.get(`http://localhost:2000/get-types`, {
      headers: {
        'token': this.state.token
      }
    }).then((res) => {
      this.setState({ loading: false, adTypes: res.data.adTypes, pages: res.data.pages });
    }).catch((err) => {
      swal({
        text: err.response.data.errorMessage,
        icon: "error",
        type: "error"
      });
      this.setState({ loading: false, products: [], pages: 0 },()=>{});
    });
  }

  getAds = () => {
    console.time('getAds');
    axios.post('http://localhost:2000/get-ad-commitments', {}).then((res) => {
      let adHashes = res.data.adHash;

      let similarity = [];
      for(let i = 0; i < adHashes.length; i++) {
        let adHash = JSON.parse(adHashes[i]);
        similarity.push({
          index: i,
          value: dot(adHash, this.state.cohort)
        });
      }

      similarity.sort(function(a, b) {
        return b.value - a.value;
      });
      console.log(similarity);
      console.log(adHashes[similarity[0].index]);

      let adChoice = similarity[0].index;
      let x = bigInt(res.data.x[adChoice]);

      let randomValue = crypto.randomBytes(64);
      let k = bigInt(`${randomValue.toString('hex')}`, 16);

      let v = k.modPow(parameters.OT.e, parameters.OT.N).add(x).mod(parameters.OT.N);

      axios.post('http://localhost:2000/get-ads', {
        v: v.toString(),
        x: res.data.x
      }).then((res) => {
        let m = bigInt(res.data.m[adChoice]).subtract(k).toString(16);
        let message = JSON.parse(Buffer.from(m, 'hex').toString());
        this.setState({ adDisplay: true, adResults: message });
        console.log(message);
      }).catch((err) => {
        console.log(err)
        swal({
          text: "Something went wrong.",
          icon: "error",
          type: "error"
        });
      });
    }).catch((err) => {
      console.log(err)
      swal({
        text: "Something went wrong.",
        icon: "error",
        type: "error"
      });
    });
    console.timeEnd('getAds');
  }

  getSearchResults = () => {
    console.time('getSearchResults');
    this.setState({ loading: true });
    let API_KEY = "AIzaSyB3CG76HG9E63Z2SPwWag8UmRWGd9QVWw4";
    let CX = "b2db8f1415b4d3975";
    let srcResults = [
      {title: "123 - Search Result1 - Google", link: "www.googlelink1.com", snippet: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "}, 
      {title: "Search Result2", link: "www.googlelink2.com", snippet: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "}
    ]

    axios.get('https://www.googleapis.com/customsearch/v1?key='+API_KEY+'&cx='+CX+'&q='+this.state.searchTags)
      .then((res) => {
        srcResults = [];
        for(let i=0; i<res.data.items.length; i++){
          srcResults.push({title: res.data.items[i].title, link: res.data.items[i].formattedUrl, snippet: res.data.items[i].snippet, tag: this.state.searchTags})
        }
        this.setState({ loading: false, searchDisplay: true, searchResults: srcResults });
      })
      .catch((err) => {
        swal({
          text: "Looks like something is wrong with the Search API",
          icon: "error",
          type: "error"
        });
        this.setState({ loading: false, products: [], pages: 0 },()=>{});
      });
    // this.setState({ loading: false, searchDisplay: true, searchResults: srcResults });
    console.timeEnd('getSearchResults');
  }

  updateCohort = (item) => {
    console.time('Update-cohorts-Fetch-ads');
    updateCohortValue(item).then((cohortID) => {
      this.setState({ cohort: cohortID });
      console.log("simhash:", JSON.stringify(cohortID));
      this.getAds();
      console.timeEnd('Update-cohorts-Fetch-ads');
    });
  }

  render() {
    return (
      <Container>
        {this.state.loading && <LinearProgress size={40} />}
        <Stack spacing={2}>
            <div>
              <h2>Search</h2>
              <center>
                <Autocomplete
                  id="autocomplete"
                  value={this.state.searchTags}
                  onChange={(event, newValue) => {
                    this.setState({searchTags: newValue})
                  }}
                  className="button_style" multiple limitTags={2}
                  options={this.state.adTypes}
                  getOptionLabel={(option) => option}
                  renderInput={(params) => (
                    <TextField {...params} label="Search" placeholder="Favorites" key={params}/>
                  )}
                  sx={{ width: '500px' }}
                /><br />
                
                <Button className="button_style" variant="contained" size="small" onClick={(e) => this.getSearchResults()}>Search</Button>
              </center>
            </div>

          <Divider /><br />
          {this.state.adDisplay && 
              <Item key="ad">
                Ad: { this.state.adResults[0].title }
                <div>
                  { this.state.adResults[0].notes }
                </div>
              </Item>
          }

          {this.state.searchDisplay && 
              <Item key="results">
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  { this.state.searchResults.map((item) => 
                      <>
                        <button style={{ textDecoration: 'none', backgroundColor: 'white', width: '100%', border: 'none' }} key={item.link+Math.random()} onClick={(e) => this.updateCohort(item)}>
                          <ListItem alignItems="flx-start" key={item.title}>
                            <ListItemText key={item.snippet+Math.random()}
                              primary={(item.title.split("-").length > 1) ? item.title.split("-")[1] : item.title.split("-")[0]}
                              secondary={
                                <React.Fragment key={item.link+Math.random()}>
                                  <Link><Typography key={item.link+Math.random()} sx={{ display: 'inline' }} component="span" variant="body2" color="text.primary" >{item.link}</Typography></Link>
                                  <br />{item.snippet}
                                </React.Fragment>
                              }
                            />
                        </ListItem>
                      </button>
                      <Divider key={item.title} variant="inset" component="li" />
                    </>
                    )
                  }
                </List>
              </Item>
          }
        </Stack>

      </Container>
    );
  }
}