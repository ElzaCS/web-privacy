import React, { Component } from 'react';
import { Button, TextField, LinearProgress } from '@material-ui/core';
import { Autocomplete, Container, Stack, Paper, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import swal from 'sweetalert';
import { updateCohortValue } from './helper/cohort';

const axios = require('axios');

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
      // openProductModal: false,
      // openProductEditModal: false,
      // id: '',
      // name: '',
      // desc: '',
      // price: '',
      // discount: '',
      // file: '',
      // fileName: '',
      // page: 1,
      search: '',
      // products: [],
      adTypes: [],
      searchTags: [],
      // pages: 0,
      loading: false,
      searchDisplay: false,
      searchResults: [],
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
      this.setState({ token: token }, () => {
        this.getAdTypes();
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

  getSearchResults = () => {
    this.setState({ loading: true });
    let API_KEY = "[ENTER YOUR API KEY]";
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
          {this.state.searchDisplay && 
              <Item key="ad">Ads</Item>
          }

          {this.state.searchDisplay && 
              <Item key="results">
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  { this.state.searchResults.map((item) => 
                      <>
                        <button style={{ textDecoration: 'none', backgroundColor: 'white', width: '100%', border: 'none' }} href={item.link} key={item.link+Math.random()} onClick={() => updateCohortValue(item)}>
                          <ListItem alignItems="flex-start" key={item.title}>
                            <ListItemText key={item.snippet+Math.random()}
                              primary={(item.title.split("-").length > 1) ? item.title.split("-")[1] : item.title.split("-")[0]}
                              secondary={
                                <React.Fragment key={item.link+Math.random()}>
                                  <Link to={item.link}><Typography key={item.link+Math.random()} sx={{ display: 'inline' }} component="span" variant="body2" color="text.primary" >{item.link}</Typography></Link>
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