'strict mode'

const Y = require('yjs')
require('y-array')(Y)
require('y-memory')(Y)
require('y-indexeddb')(Y)
require('y-ipfs-connector')(Y)

const d3 = require('d3')

const IPFS = require('ipfs')
const ipfs = new IPFS({
  EXPERIMENTAL: {
    pubsub: true
  }
})

ipfs.once('start', () => {
  console.log('IPFS started')
  Y({
    db: {
      name: 'indexeddb'
    },
    connector: {
      name: 'ipfs',
      room: 'mozfest-flipchart',
      ipfs: ipfs
    },
    share: {
      flipchart: 'Array'
    }
  }).then(function (y) {
    console.log('Y started')
    var drawing = y.share.flipchart
    var renderPath = d3.line()
      .x(function (d) { return d[0] })
      .y(function (d) { return d[1] })
      .curve(d3.curveMonotoneX)

      // .interpolate('basis')

    var svg = d3.select('#flipchart')
      .call(d3.drag()
        .on('start', dragstart)
        .on('drag', drag)
        .on('end', dragend))

    // create line from a shared array object and update the line when the array changes
    function drawLine (yarray) {
      var line = svg.append('path').datum(yarray.toArray()).attr('class', 'line')
      line.attr('d', renderPath)
      yarray.observe(function (event) {
        // we only implement insert events that are appended to the end of the array
        event.values.forEach(function (value) {
          line.datum().push(value)
        })
        line.attr('d', renderPath)
      })
    }

    // call drawLine every time an array is appended
    y.share.flipchart.observe(function (event) {
      if (event.type === 'insert') {
        event.values.forEach(drawLine)
      } else {
        // just remove all elements (thats what we do anyway)
        svg.selectAll('path').remove()
      }
    })
    // draw all existing content
    for (var i = 0; i < drawing.length; i++) {
      drawLine(drawing.get(i))
    }

    var sharedLine = null
    function dragstart () {
      drawing.insert(drawing.length, [Y.Array])
      sharedLine = drawing.get(drawing.length - 1)
    }

    // After one dragged event is recognized, we ignore them for 33ms.
    var ignoreDrag = null
    function drag () {
      if (sharedLine && !ignoreDrag) {
        ignoreDrag = window.setTimeout(function () {
          ignoreDrag = null
        }, 33)
        const mouse = d3.mouse(this)
        sharedLine.push([mouse])
      }
    }

    function dragend () {
      sharedLine = null
      window.clearTimeout(ignoreDrag)
      ignoreDrag = null
    }
  })
})
