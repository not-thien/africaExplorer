// A UI to interactively choose various indicators of degraded land in Africa.
// select a date range, admin level, and view it.

// The namespace for our application.  All the state is kept in here.
var app = {};

/** Creates the UI panels. */
app.createPanels = function() {
  /* The introduction section. */
  app.intro = {
    panel: ui.Panel([
      ui.Label({
        value: 'Degraded Land Explorer - Africa',
        style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
      }),
      ui.Label('This app allows you to choose various indicators for degraded land ' +
               ' over different administrative levels.')
    ])
  };
  
  /* Indicator selection controls */
  app.indicators = {
    indicatorSelection: ui.Select({
      items: Object.keys(app.INDICATORS)
    })
  };
  
  /* Indicator selection panel */
  app.indicators.panel = ui.Panel({
    widgets: [
      ui.Label('2) Select degraded land indicators', {fontWeight: 'bold'}),
    ],
    style: app.SECTION_STYLE
  });

  
  
  /* The collection filter controls. */
  app.filters = {
    startDate: ui.Textbox('YYYY-MM-DD'),
    endDate: ui.Textbox('YYYY-MM-DD'),
    applyButton: ui.Button('Apply Filters/Threshholds to Indicators', app.updateFilters),
    threshhold: ui.Textbox('# of Indicators', '1')
  };

  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('3) Select Date Range (if applicable to indicator) & Indicator Threshhold', {fontWeight: 'bold'}),
      ui.Label('Start date', app.HELPER_TEXT_STYLE), app.filters.startDate,
      ui.Label('End date', app.HELPER_TEXT_STYLE), app.filters.endDate,
      ui.Label('Select number of active indicators to label land as degraded'), app.filters.threshhold,
      ui.Panel([
        app.filters.applyButton,
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });

  /* admin level picker section. */
  app.picker = {
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      // placeholder: 'Select an admin level',
      items: Object.keys(app.ADMIN_LEVELS), 
      onChange: app.refreshMapLayer         
    }),
    // Create a button that centers the map on a given object.
    centerButton: ui.Button('Center on map', function() {
      Map.setCenter(21.31, 3.9);     
    })
  };

  /* admin Level picker controls */
  app.picker.panel = ui.Panel({
    widgets: [
      ui.Label('1) Select an admin level (WARNING: resets current calculations & selected regions)', {fontWeight: 'bold'}),
      ui.Panel([
        app.picker.select,
        app.picker.centerButton
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });
  
  /* Export widget initialization */
  app.export = {
    exportButton: ui.Button({
      label: 'Export Index Images', 
      onClick: app.export_imgs})
  };
  
  /* Export button */
  app.export.panel = ui.Panel({
    widgets: [
      ui.Label('4) Export the calculated index images (WARNING: water bodies not omitted)', {fontWeight: 'bold'}),
      ui.Panel([
        app.export.exportButton
        ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });
};

/** Creates the app helper functions. */
app.createHelpers = function() {
  // Register a click handler for the map that adds the clicked point to the
  // list and updates the map overlay. Stolen from Population Explorer GEE example
  app.handleMapClick = function(location) {
    print('clicked received');
    app.selectedPoints.push([location.lon, location.lat]);
    app.updateOverlay();
  }
  
  app.export_imgs = function() {
    // app.EXPORT_IMAGES.map(function(img) {
    //     Export.image.toDrive({
    //       image: img.int16,
    //       description: 'africaExplorerIndexImage',
    //       scale: 10000, // default scale for exporting big countries
    //       maxPixels: 100000000
    //     })
    // })
    var tracker = 0;
    app.EXPORT_IMAGES.map(function(img) {
      
      Export.image.toDrive({
        image: img.toDouble(),
        folder: 'gee_folder',
        description: app.EXPORT_NAMES[tracker],
        scale: 10000, // default scale for exporting big countries
        maxPixels: 100000000
      });
      tracker += 1;
    })
    
    
    
    // var test = ee.Image(app.EXPORT_IMAGES[0]).toDouble();
    // Export.image.toDrive({
    //   image: test,
    //   folder: 'Test_Folder',
    //   description:'test_export_imgs',
    //   scale: 10000, // default scale for exporting big countries
    //   maxPixels: 100000000
    // });
    
    // Set export folder (relative to Google Drive root folder)
    // var output_folder = 'gee-export';
    // var test = ee.ImageCollection(app.EXPORT_IMAGES);
    
    // // Export collection image to Drive
    // app.batch.Download.ImageCollection.toDrive(
    //   test,
    //   output_folder,
    //   {
    //     name: '{id}', // {id}, {system_date} and all other properties (e.g., {WRS_PATH})
    //     // dateFormat: 'yyyy-MM-dd', // Default
    //     scale: 10000,
    //     maxPixels: 1e13,
    //     // region: colorado_boundary, // rmnp_boundary,
    //     type: 'int16' // 'float', 'byte', 'int', 'double', 'long', 'short', 'int8',
    //                   // 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32'
    //   }
    // );

    
  };
  
  app.getSelectedUnits = function() {
    var adminLevel = app.ADMIN_LEVELS[app.picker.select.getValue()];
    var adminFC = adminLevel[0]; // FC = FeatureCollection
    print("get selected units");
    return adminFC.filterBounds(ee.Geometry.MultiPoint(app.selectedPoints));
  }
  
  app.updateOverlay = function() {
    var overlay = app.getSelectedUnits().style({color: '8856a7', fillColor:'8856a7C0'});
    Map.layers().set(2, ui.Map.Layer(overlay));
  }
  
  /** Applies the selection filters currently selected in the UI. */
  app.updateFilters = function() {
    // Set filter variables. & update EVI accordingly
    var start = app.filters.startDate.getValue();
    var end = app.filters.endDate.getValue();
    if (start) start = ee.Date(start);
    if (end) end = ee.Date(end);
    if (start) { //BUG: potential bug where date removed after running once
      app.DATE_RANGE = {start: start,
                        end: end};
    }
    app.INDEX_IMAGES = [];
    app.EXPORT_IMAGES = [];
    app.EXPORT_NAMES = [];
    // Map.clear();
    Map.onClick(app.handleMapClick);
    app.loopThruShapefile();
  };
  
  app.loopThruShapefile = function() {
    var adminLevel = app.ADMIN_LEVELS[app.picker.select.getValue()];
    var adminNum = adminLevel[1];
    var adminFC = app.getSelectedUnits(); // FC = FeatureCollection
    // based on adminLevel, dissolve into list by that NAME_ and do the math for selected degraded indicators.
    adminFC.aggregate_array('ADM'+adminNum+'_NAME').evaluate(function (names) {
      names.map(function (name) {
        print("running");
        app.INDEX_IMAGES = []; // reset binary imgs per segment
        var section = adminFC
          .filter(ee.Filter.equals('ADM'+adminNum+'_NAME', name))
          .first();
        app.SELECTED_INDS.forEach(function (indicator) {  // loop thru all checkboxes
          if (indicator.checkbox.getValue()) {
            var indicatorSelected = app.INDICATORS[indicator.indicator];
            if (indicatorSelected == 'maxTrend') {
              app.findTrendInEVI(section.geometry(), name);
            } else if (indicatorSelected == 'seasonLength') {
              app.findTrendInSeasonLength(section.geometry(), name);
            } else if (indicatorSelected == 'seasonStart') {
              app.findTrendInSeasonStart(section.geometry(), name);
            } else if (indicatorSelected == 'bareSoil') {
              app.findNDBal(section.geometry(), name);
            }
            // CALL OTHER DEGRADED LAND INDICATORS HERE
          }
        }) 
        // calculate index for section after all indicators calculated
        app.calculateIndex(name);
        
        // Add water mask
        var sectionWater = app.WATER.clip(section.geometry());
        Map.addLayer(sectionWater, app.waterMaskVis, name+" Water Mask");
      }) //endMap
    }); //endAggregate_Array
    Map.addLayer(adminFC.style(app.polyVis), {}, "Admin Level Borders");
  }
  
  /** Based off of the given index threshhold, creates a highlighting layer */
  app.calculateIndex = function(name) {
    var threshhold = app.filters.threshhold.getValue();
    var binaryImages = ee.ImageCollection(app.INDEX_IMAGES);
    // 1 means enough active indicators at this pixel to meet threshhold, 0 means not
    binaryImages = binaryImages.map(function(image){
      return image.select(['.*'], ['Active']); // rename so .sum() works well
    });
    var indexImage = binaryImages.sum();
    app.EXPORT_IMAGES.push(indexImage);
    app.EXPORT_NAMES.push(name);
    Map.addLayer(indexImage, {min: 0, max: threshhold}, name + " Degraded Land Indicators", true);
  }
  
  /** Function to calculate maximum EVI trends over time */
  app.findTrendInEVI = function(sectionGeom, sectionName) {
    var EVI = app.L8.filterBounds(sectionGeom);
    print(sectionGeom);
    
    // Date filtering logic
    var startYear, endYear;
    if (app.DATE_RANGE.start) {
      startYear = app.DATE_RANGE.start.get('year');
      if (Number(startYear) < Number("2013")) { // Data only available after 2013
        startYear = "2013";
      }
    } else {
      startYear = "2013";
    }
    if (app.DATE_RANGE.end) {
      endYear = app.DATE_RANGE.end.get('year');
    } else {
      endYear = "2023";
    }

    // a fxn to calculate EVI. EVI calculated via the USGS definition of EVI equation w/ timestamp
    var findEVI = function(image) {
      var output = image.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': image.select('SR_B5'),
      'RED': image.select('SR_B4'),
      'BLUE': image.select('SR_B2')
      })
      .rename('evi')
      .addBands(image.metadata('DATE_PRODUCT_GENERATED').divide(1000 * 60 * 60 * 24 * 365));
      return output;
    };
    
    // need an array to hold all the images
    var yearlyMaxes = [];
    
    // loop thru all the years we wanna look at
    for (var year = startYear; year < endYear; year++) { 
      var startDate = year + "-01-01"
      var endDate = year + "-12-31"
      
      // preprocessing the landsat images by minimizing query area and date range, using clean data,
      // and adding timeband and EVI
      var pp_L8 = app.L8
      .filterBounds(sectionGeom)
      .filterDate(startDate, endDate)
      .filterMetadata("CLOUD_COVER", "less_than", 1)
      .map(findEVI)
      .max() // for each pixel, get highest value of EVI band
      .clip(sectionGeom); // speeds up calculations
      
      // add the new image to the list
      yearlyMaxes.push(pp_L8);
    }
    
    // convert the list into an actual IC
    var timedEviMaxes = ee.ImageCollection(yearlyMaxes);
    
    // reduce the ImageCollection w/ linear fit w/ time as x-axis and EVI as y-axis. Only care about the trend ('scale' band)
    var linearFit = timedEviMaxes.select(['DATE_PRODUCT_GENERATED', 'evi']).reduce(ee.Reducer.linearFit()).select('scale');
    
    // highlight only the pixels that meet the threshhold
    var percentileDictionary = linearFit.reduceRegion({
      reducer: ee.Reducer.percentile([25]),
      geometry: sectionGeom,
      scale: 300,
      maxPixels: 1e9,
      tileScale: 4,
    });
    var worst25 = linearFit.lte(ee.Number(percentileDictionary.get("scale")));
    
    // Add to final index + visualize
    app.INDEX_IMAGES.push(worst25);
    Map.addLayer(worst25, {}, sectionName + ' Severely Decreasing Yearly EVI max', false, 0.5);
  }
  
  /** Function to calculate trend in length of growing season */
  app.findTrendInSeasonLength = function(sectionGeom, sectionName) {
    var sectionMODIS = app.MODIS;
    
    // Date filtering logic
    var startYear, endYear;
    if (app.DATE_RANGE.start) {
      startYear = app.DATE_RANGE.start.get('year');
      if (Number(startYear) < Number("2001")) { // MODIS Data only available after 2001
        startYear = "2001";
      }
    } else {
      startYear = "2001";
    }
    if (app.DATE_RANGE.end) {
      endYear = app.DATE_RANGE.end.get('year');
    } else {
      endYear = "2023";
    }
    sectionMODIS.filterDate(startYear, endYear);
    
    var seasonMODIS = sectionMODIS.map(function(image) {
      return image.expression('SEN - GREEN', {
        'SEN': image.select('Senescence_1'),
        'GREEN': image.select('Greenup_1')
      })
      .addBands(image.metadata('system:time_start').divide(1000 * 60 * 60 * 24 * 365))
      .rename(['SeasonLength', 'Time Stamp'])
      .clip(sectionGeom);
    });

    var linearFit = seasonMODIS.select(['Time Stamp', 'SeasonLength']).reduce(ee.Reducer.linearFit()).select('scale');
    // highlight only the pixels that meet the threshhold
    var percentileDictionary = linearFit.reduceRegion({
      reducer: ee.Reducer.percentile([25]),
      geometry: sectionGeom,
      scale: 300,
      maxPixels: 1e9,
      tileScale: 4,
    });
    var worst25 = linearFit.lte(ee.Number(percentileDictionary.get("scale")));
    app.INDEX_IMAGES.push(worst25);
    Map.addLayer(worst25, {}, sectionName + ' Severely Shortening Growing Season Length', false, 0.5);
  }
  
  /** Function to calculate trend in start of growing season */
  app.findTrendInSeasonStart = function(sectionGeom, sectionName) {
    var sectionMODIS = app.MODIS;
    
    // Date filtering logic
    var startYear, endYear;
    if (app.DATE_RANGE.start) {
      startYear = app.DATE_RANGE.start.get('year');
      if (Number(startYear) < Number("2001")) { // MODIS Data only available after 2001
        startYear = "2001";
      }
    } else {
      startYear = "2001";
    }
    if (app.DATE_RANGE.end) {
      endYear = app.DATE_RANGE.end.get('year');
    } else {
      endYear = "2023";
    }
    sectionMODIS.filterDate(startYear, endYear);

    
    var seasonMODIS = sectionMODIS.map(function(image) {
      return image.expression('GREEN', {
        'GREEN': image.select('Greenup_1')
      })
      .addBands(image.metadata('system:time_start').divide(1e7))
      .rename(['SeasonStart', 'Time Stamp'])
      .clip(sectionGeom);
    });
    
    var linearFit = seasonMODIS.select(['Time Stamp', 'SeasonStart']).reduce(ee.Reducer.linearFit()).select('scale');
    // highlight only the pixels that meet the threshhold
    var percentileDictionary = linearFit.reduceRegion({
      reducer: ee.Reducer.percentile([75]),
      geometry: sectionGeom,
      scale: 300,
      maxPixels: 1e9,
      tileScale: 4,
    });
    var worst25 = linearFit.gte(ee.Number(percentileDictionary.get("scale")));
    app.INDEX_IMAGES.push(worst25);
    Map.addLayer(worst25, {}, sectionName + ' Late Growing Season Start', false, 0.5);
  }
  
  app.findNDBal = function(sectionGeom, sectionName) {
    var dataset = 'LANDSAT/LE07/C02/T2';
    var sectionL7 = ee.ImageCollection(dataset).filterBounds(sectionGeom);

    // Date filtering logic
    var startYear, endYear;
    if (app.DATE_RANGE.start) {
      startYear = app.DATE_RANGE.start.get('year');
      if (Number(startYear) < Number("1999")) { // Landsat Data only available 1999-2021
        startYear = "1999";
      }
    } else {
      startYear = "1999";
    }
    if (app.DATE_RANGE.end) {
      endYear = app.DATE_RANGE.end.get('year');
    } else {
      endYear = "2021";
    }
    sectionL7 = sectionL7.filterDate(startYear, endYear).mean().clip(sectionGeom); // placeholder reducer
    var spectral = require("users/dmlmont/spectral:spectral");
    sectionL7 = spectral.scale(sectionL7, dataset);
    
    var parameters = {
      "S1": sectionL7.select("B5"),
      "T1": sectionL7.select("B6_VCID_2"),
    };
    var L7_NDBaI = spectral.computeIndex(sectionL7,"NDBaI",parameters).select('NDBaI');
    
    // highlight only the pixels that meet the threshhold
    var percentileDictionary = L7_NDBaI.reduceRegion({
      reducer: ee.Reducer.percentile([75]),
      geometry: sectionGeom,
      scale: 300,
      maxPixels: 1e9,
      tileScale: 4,
    });
    var worst25 = L7_NDBaI.gte(ee.Number(percentileDictionary.get("NDBaI")));
    app.INDEX_IMAGES.push(worst25);
    Map.addLayer(worst25,{"min":0,"max":1,"bands":"NDBaI"}, sectionName + "'s NDBaI", false, 0.5);
  }
  
  /** Refreshes the current map layer based on the UI widget states. */
  app.refreshMapLayer = function() {
    Map.clear();
    app.SELECTED_INDS.forEach(function (indicator) {  // reset all checkboxes
      indicator.checkbox.setValue(false);
    });
    app.selectedPoints = [];
    var adminLevel = app.ADMIN_LEVELS[app.picker.select.getValue()]; 
    var adminNum = adminLevel[1];
    var adminFC = adminLevel[0]; // FC = FeatureCollection
    Map.addLayer(adminLevel[0].style(app.polyVis), {}, "Admin Level Borders");
    Map.onClick(app.handleMapClick);
  };
};

/** Creates the app constants. */
app.createConstants = function() {
  var countries = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0").filterBounds(geometry);
  var departments = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1").filterBounds(geometry);
  var districts = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2").filterBounds(geometry);
  app.ADMIN_LEVELS = {
    Countries: [countries, 0],
    Departments: [departments, 1],
    Districts: [districts, 2]
  };
  app.INDICATORS = {
    'Bottom quartile of yearly EVI maxes (linear trend)': 'maxTrend', 
    'Trend in length of season': 'seasonLength',
    'Trend in start of season': 'seasonStart',
    'Normalized Difference Bareness Index': 'bareSoil',
  };
  app.INDEX_IMAGES = [];
  app.EXPORT_IMAGES = [];
  app.EXPORT_NAMES = [];
  app.polyVis = {
    color: '0000ff',
    width: 1,    
    fillColor: '00000000'
  };
  app.DATE_RANGE = {};
  app.L8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
             .filterBounds(geometry)
             .filterMetadata("CLOUD_COVER", "less_than", 1);
  app.MODIS = ee.ImageCollection("MODIS/006/MCD12Q2")
             .map(function(image) {return image.clip(geometry)}); // filterBounds() doesn't work w/ MODIS
  var waterMaskDataset = ee.ImageCollection('MODIS/006/MOD44W')
                  .filter(ee.Filter.date('2015-01-01'))
                  .map(function(img) {return img.clip(geometry)})
                  .select('water_mask')
                  .first();
  app.WATER = waterMaskDataset.updateMask(
    waterMaskDataset.select('water_mask').eq(1));
  app.waterMaskVis = {
    min: 0.0,
    max: 1.0,
    palette: ['71e5ff', '71e5ff'],
  };
  app.SECTION_STYLE = {margin: '20px 0 0 0'};
  app.selectedPoints = [];
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
};


/** Creates the application interface. */
app.boot = function() {
  app.createConstants();
  app.createHelpers();
  app.createPanels();
    // need this to get a list of the checkboxes. 
  app.SELECTED_INDS = Object.keys(app.INDICATORS).map(function (ind) {
      var checkbox = ui.Checkbox({label: ind});
      app.indicators.panel.add(checkbox);
      return {'checkbox': checkbox, 'indicator': ind};
  });
  app.picker.select.setValue(app.picker.select.items().get(0)); // default top admin level
  var main = ui.Panel({
    widgets: [
      app.intro.panel,
      app.picker.panel,
      app.indicators.panel,
      app.filters.panel,
      // app.data.panel, // charts and tables here
      app.export.panel
    ],
    style: {width: '320px', padding: '8px'}
  });
  Map.setCenter(21.31, 3.9);
  ui.root.insert(0, main); // potential issue with resetting charts at a specific position
  // app.updateFilters();
};
Map.style().set({cursor: 'crosshair'});
app.boot();
Map.onClick(app.handleMapClick);
