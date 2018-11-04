/* global window */
import React, {Component} from 'react';



import MapDCon from '@mapd/connector/dist/browser-connector';
 const defaultQueryOptions = {};
 var deckgl;
 var currentFilter={seaLevel:0,NOR:5,commercial:"COMM-MO','COMM",government:'GOVT',duplex:'DUP',quad:'QUAD',residential:'CA - Res',condo:'CA - Condo',SFR:'SFR',GP:1,HP:0,HP_check:0,freeze:0,pointSize:5,DTM:1,DSM:1}
 // var debounceZoom = debounce(function(v,boundingPoly){
 //  zoomCheck(v.zoom)
 //  executeQuery(boundingPoly);
 // }, 500);




import MapGL from 'react-map-gl';
import DeckGLOverlay from './deckgl-overlay';
import {
  LayerControls,
  HEXAGON_CONTROLS
} from './layer-controls';
import Charts from './charts';
import {tooltipStyle} from './style';
import taxiData from '../../../data/taxi';






const connector = new MapdCon();
connector.protocol("https")
  .host('use2-api.mapd.cloud')
  .port(443)
  .dbName('mapd')
  .user('T74034EBC55A24BF6A33')
  .password('p70KZpgqaRGcwIFSHJG9dThHraux4N7gQIJQycnx') 
  .connectAsync()
  .then(session=>
    {
      Promise.all([session.queryAsync('SELECT * FROM uber_movement_data21', defaultQueryOptions), session.queryAsync('SELECT * FROM san_francisco_taz_good', defaultQueryOptions)])
      .then(values => {
              createDeckGL(values);
    })  })
.catch(error => {
    console.error("Something bad happened: ", error)
  })





const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v9';
// Set your mapbox token here
// const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
const MAPBOX_TOKEN = "pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoiY2o4OW90ZjNuMDV6eTMybzFzbmc3bWpvciJ9.zfRO_nfL1O3d2EuoNtE_NQ"

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      ...props,
      viewport: {
        width: window.innerWidth-10,
        height: window.innerHeight,
        longitude: -74,
        latitude: 40.7,
        zoom: 10,
        maxZoom: 16,
        ...props.viewport
      },
      settings: Object.keys(HEXAGON_CONTROLS).reduce((accu, key) => ({
        ...accu,
        [key]: HEXAGON_CONTROLS[key].value
      }), {}),
      status: 'LOADING',
      selectedHour: null
    };
    this._resize = this._resize.bind(this);
  }

  componentDidMount() {
    this._processData();
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._resize);
  }
  _processData() {
    if (taxiData) {
      this.setState({status: 'LOADED'});
      const data = taxiData.reduce((accu, curr) => {

        const pickupHour = new Date(curr.pickup_datetime).getUTCHours();
        const dropoffHour = new Date(curr.dropoff_datetime).getUTCHours();

        const pickupLongitude = Number(curr.pickup_longitude);
        const pickupLatitude = Number(curr.pickup_latitude);

        if (!isNaN(pickupLongitude) && !isNaN(pickupLatitude)) {
          accu.points.push({
            position: [pickupLongitude, pickupLatitude],
            hour: pickupHour,
            pickup: true
          });
        }

        const dropoffLongitude = Number(curr.dropoff_longitude);
        const dropoffLatitude = Number(curr.dropoff_latitude);

        if (!isNaN(dropoffLongitude) && !isNaN(dropoffLatitude)) {
          accu.points.push({
            position: [dropoffLongitude, dropoffLatitude],
            hour: dropoffHour,
            pickup: false
          });
        }

        const prevPickups = accu.pickupObj[pickupHour] || 0;
        const prevDropoffs = accu.dropoffObj[dropoffHour] || 0;

        accu.pickupObj[pickupHour] = prevPickups + 1;
        accu.dropoffObj[dropoffHour] = prevDropoffs + 1;

        return accu;
      }, {
        points: [],
        pickupObj: {},
        dropoffObj: {}
      });

      data.pickups = Object.entries(data.pickupObj).map(([hour, count]) => {
        return {hour: Number(hour), x: Number(hour) + 0.5, y: count};
      });
      data.dropoffs = Object.entries(data.dropoffObj).map(([hour, count]) => {
        return {hour: Number(hour), x: Number(hour) + 0.5, y: count};
      });
      data.status = 'READY';

      this.setState(data);
    }
  }

  _onHighlight(highlightedHour) {
    this.setState({highlightedHour});
  }

  _onHover({x, y, object}) {
    this.setState({x, y, hoveredObject: object});
  }

  _onSelect(selectedHour) {
    this.setState({selectedHour:
      selectedHour === this.state.selectedHour ?
        null :
        selectedHour
      });
  }

  _onViewportChange(viewport) {
    this.setState({
      viewport: {...this.state.viewport, ...viewport}
    });
  }

  _resize() {
    this._onViewportChange({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  _updateLayerSettings(settings) {
    this.setState({settings});
  }

  render() {
    return (
      <div>
        {this.state.hoveredObject &&
          <div style={{
            ...tooltipStyle,
            transform: `translate(${this.state.x}px, ${this.state.y}px)`
          }}>
            <div>{JSON.stringify(this.state.hoveredObject)}</div>
          </div>}
        {this.props.noControls ? null : <LayerControls
          settings={this.state.settings}
          propTypes={HEXAGON_CONTROLS}
          onChange={settings => this._updateLayerSettings(settings)}
        />}
        <MapGL
          {...this.state.viewport}
          mapStyle={MAPBOX_STYLE}
          onViewportChange={viewport => {
            this._onViewportChange(viewport);
          }}
          mapboxApiAccessToken={MAPBOX_TOKEN}>
          <DeckGLOverlay
            viewport={this.state.viewport}
            data={this.state.points}
            hour={this.state.highlightedHour || this.state.selectedHour}
            onHover={hover => this._onHover(hover)}
            {...this.state.settings}
          />
        </MapGL>
        <Charts {...this.state}
          highlight={hour => this._onHighlight(hour)}
          select={hour => this._onSelect(hour)}
        />
      </div>
    );
  }
}
