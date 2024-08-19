import React, { Component } from 'react';
import { Table } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
interface PerspectiveViewerElement extends HTMLElement {
  load: (table: Table) => void,
}

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, {}> {
  // Perspective table
  table: Table | undefined;

  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem = document.getElementsByTagName('perspective-viewer')[0] as unknown as PerspectiveViewerElement;
    // View is the kind of graph we want to visualise data with and y_line is to get a continuous line graph
    elem.setAttribute('view', 'y_line');
    // Column-pivots is what will allow us to distinguis stock ABC from DEF
    elem.setAttribute('column-pivots', '["stock"]');
    // Row-pivots takes care of our x-axis, allowing us to map each datapoint based on its timestamp
    elem.setAttribute('row-pivots', '["timestamp"]');
    // Columns allows us to focus on a particular part of a stock's data along the y-axis and in this case, we only care about top_ask_price
    elem.setAttribute('columns', '["top_ask_price"]');
    // Aggregates allows us to handle the duplicated data and consolidate it into a single data point
    // In this case, we only want to consider a dp unique if it has a unique stock name and timestamp
    // If there are duplicates, we average out the top_bid/ask_prices of these similar dp before treating them as one
    elem.setAttribute('aggregates', `
      {"stock": "distinct count",
      "top_ask_price": "avg",
      "top_bid_price": "avg",
      "timestamp": "distinct_count"}`);

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'date',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);
    }
    if (this.table) {
      // Load the `table` in the `<perspective-viewer>` DOM reference.

      // Add more Perspective configurations here.
      elem.load(this.table);
    }
  }

  componentDidUpdate() {
    // Everytime the data props is updated, insert the data into Perspective table
    if (this.table) {
      // As part of the task, you need to fix the way we update the data props to
      // avoid inserting duplicated entries into Perspective table again.
      this.table.update(this.props.data.map((el: any) => {
        // Format the data from ServerRespond to the schema
        return {
          stock: el.stock,
          top_ask_price: el.top_ask && el.top_ask.price || 0,
          top_bid_price: el.top_bid && el.top_bid.price || 0,
          timestamp: el.timestamp,
        };
      }));
    }
  }
}

export default Graph;
