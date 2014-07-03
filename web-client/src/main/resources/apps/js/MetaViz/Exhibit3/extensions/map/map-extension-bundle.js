Exhibit.MapExtension.Canvas = {};
Exhibit.MapExtension.Canvas.makeShadow = function(icon, settings) {
    console.log("Exhibit.MapExtension.Canvas.makeShadow");
    var width, height, shadowWidth, canvas, context;
    width = Exhibit.jQuery(icon).width();
    height = Exhibit.jQuery(icon).height();
    shadowWidth = width + height;
    canvas = Exhibit.jQuery("<canvas>").css("width", shadowWidth).css("height", height).attr("width", shadowWidth).attr("height", height);
    context = Exhibit.jQuery(canvas).get(0).getContext("2d");
    context.scale(1, 1 / 2);
    context.translate(height / 2, height);
    context.transform(1, 0, -1 / 2, 1, 0, 0);
    context.fillRect(0, 0, width, height);
    context.globalAlpha = settings.shapeAlpha;
    context.globalCompositeOperation = "destination-in";
    context.drawImage(icon, 0, 0);
    return canvas;
};
Exhibit.MapExtension.Canvas.makeIcon = function(width, height, color, label, iconImg, iconSize, settings) {
    console.log("Exhibit.MapExtension.Canvas.makeIcon");
    var pin, pinWidth, pinHeight, lineWidth, lineColor, alpha, bodyWidth, bodyHeight, markerHeight, radius, canvas, context, meetAngle, topY, botY, leftX, rightX, scale, heightScale, widthScale, shadow;
    pin = settings.pin;
    if (iconSize > 0) {
        width = iconSize;
        height = iconSize;
        pin = false;
    }
    pinWidth = settings.pinWidth;
    pinHeight = settings.pinHeight;
    lineWidth = 1;
    lineColor = settings.borderColor || "black";
    alpha = settings.shapeAlpha;
    bodyWidth = width - lineWidth;
    bodyHeight = height - lineWidth;
    markerHeight = height + (pin ? pinHeight : 0);
    canvas = Exhibit.jQuery("<canvas>").css("width", width).css("height", markerHeight).attr("width", width).attr("height", markerHeight);
    context = Exhibit.jQuery(canvas).get(0).getContext("2d");
    context.clearRect(0, 0, width, markerHeight);
    context.beginPath();
    if (settings && (settings.shape === "circle")) {
        radius = bodyWidth / 2;
        if (!pin) {
            context.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        } else {
            meetAngle = Math.atan2(pinWidth / 2, bodyHeight / 2);
            context.arc(width / 2, height / 2, radius, Math.PI / 2 + meetAngle, Math.PI / 2 - meetAngle);
            context.lineTo(width / 2, height + pinHeight - lineWidth / 2);
        }
    } else {
        radius = bodyWidth / 4;
        topY = leftX = lineWidth / 2;
        botY = height - lineWidth / 2;
        rightX = width - lineWidth / 2;
        context.moveTo(rightX - radius, topY);
        context.arcTo(rightX, topY, rightX, topY + radius, radius);
        context.lineTo(rightX, botY - radius);
        context.arcTo(rightX, botY, rightX - radius, botY, radius);
        if (pin) {
            context.lineTo(width / 2 + pinWidth / 2, botY);
            context.lineTo(width / 2, height + pinHeight - lineWidth / 2);
            context.lineTo(width / 2 - pinWidth / 2, botY);
        }
        context.lineTo(leftX + radius, botY);
        context.arcTo(leftX, botY, leftX, botY - radius, radius);
        context.lineTo(leftX, topY + radius);
        context.arcTo(leftX, topY, leftX + radius, topY, radius);
    }
    context.closePath();
    context.fillStyle = color;
    context.globalAlpha = alpha;
    context.fill();
    if (iconImg !== null) {
        context.save();
        context.clip();
        context.globalAlpha = 1;
        context.translate(width / 2 + settings.iconOffsetX, height / 2 + settings.iconOffsetY);
        heightScale = 1 * height / iconImg.naturalHeight;
        widthScale = 1 * width / iconImg.naturalWidth;
        switch (settings.iconFit) {
        case "width":
            scale = widthScale;
            break;
        case "height":
            scale = heightScale;
            break;
        case "both":
        case "larger":
            scale = Math.min(heightScale, widthScale);
            break;
        case "smaller":
            scale = Math.max(heightScale, widthScale);
            break;
        }
        context.scale(scale, scale);
        context.scale(settings.iconScale, settings.iconScale);
        context.drawImage(iconImg, -iconImg.naturalWidth / 2, -iconImg.naturalHeight / 2);
        context.restore();
    }
    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;
    context.stroke();
    shadow = Exhibit.MapExtension.Canvas.makeShadow(canvas.get(0), settings);
    if (typeof label !== "undefined" && label !== null && label.length > 0) {
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.globalAlpha = 1;
        context.font = settings.markerFontFamily;
        context.fillStyle = settings.markerFontColor;
        context.fillText(label, width / 2, height / 2, width / 1.4);
    }
    return {
        iconURL: canvas.get(0).toDataURL(),
        shadowURL: shadow.get(0).toDataURL()
    };
};
Exhibit.GoogleMaps2View = function(containerElmt, uiContext) {
    console.log("Exhibit.GoogleMaps2View ");
    Exhibit.GoogleMaps2View._initialize();
    var view = this;
    Exhibit.jQuery.extend(this, new Exhibit.View("map-gmv2", containerElmt, uiContext));
    this.addSettingSpecs(Exhibit.GoogleMaps2View._settingSpecs);
    this._accessors = {
        getProxy: function(itemID, database, visitor) {
            visitor(itemID);
        },
        getColorKey: null,
        getSizeKey: null,
        getIconKey: null,
        getIcon: null
    };
    this._colorCoder = null;
    this._sizeCoder = null;
    this._iconCoder = null;
    this._selectListener = null;
    this._itemIDToMarker = {};
    this._markerLabelExpression = null;
    this._markerCache = {};
    this._shown = false;
    this._onItemsChanged = function() {
        view._reconstruct();
    };
    Exhibit.jQuery(uiContext.getCollection().getElement()).bind("onItemsChanged.exhibit", view._onItemsChanged);
    this.register();
};
Exhibit.GoogleMaps2View._settingSpecs = {
    center: {
        type: "float",
        defaultValue: [20, 0], //center coordinates
        dimensions: 2
    },
    zoom: {
        type: "float",
        defaultValue: 2
    },
    size: {
        type: "text",
        defaultValue: "small"
    },
    scaleControl: {
        type: "boolean",
        defaultValue: true
    },
    overviewControl: {
        type: "boolean",
        defaultValue: false
    },
    type: {
        type: "enum",
        defaultValue: "OpenStreetMap",
        choices: ["OpenStreetMap","OpenLayers WMS","GLUES gtopo 30", "GLUES world borders"] //hannes
        //choices: ["normal", "satellite", "hybrid"]
    },
    bubbleTip: {
        type: "enum",
        defaultValue: "top",
        choices: ["top", "bottom"]
    },
    mapHeight: {
        type: "int",
        defaultValue: 400
    },
    mapConstructor: {
        type: "function",
        defaultValue: null
    },
    markerLabel: {
        type: "text",
        defaultValue: ".label"
    },
    color: {
        type: "text",
        defaultValue: "#FF9000"
    },
    colorCoder: {
        type: "text",
        defaultValue: null
    },
    sizeCoder: {
        type: "text",
        defaultValue: null
    },
    iconCoder: {
        type: "text",
        defaultValue: null
    },
    selectCoordinator: {
        type: "text",
        defaultValue: null
    },
    iconSize: {
        type: "int",
        defaultValue: 0
    },
    iconFit: {
        type: "text",
        defaultValue: "smaller"
    },
    iconScale: {
        type: "float",
        defaultValue: 1
    },
    iconOffsetX: {
        type: "float",
        defaultValue: 0
    },
    iconOffsetY: {
        type: "float",
        defaultValue: 0
    },
    shape: {
        type: "text",
        defaultValue: "circle"
    },
    shapeWidth: {
        type: "int",
        defaultValue: 24
    },
    shapeHeight: {
        type: "int",
        defaultValue: 24
    },
    shapeAlpha: {
        type: "float",
        defaultValue: 0.7
    },
    pin: {
        type: "boolean",
        defaultValue: true
    },
    pinHeight: {
        type: "int",
        defaultValue: 6
    },
    pinWidth: {
        type: "int",
        defaultValue: 6
    },
    sizeLegendLabel: {
        type: "text",
        defaultValue: null
    },
    colorLegendLabel: {
        type: "text",
        defaultValue: null
    },
    iconLegendLabel: {
        type: "text",
        defaultValue: null
    },
    markerScale: {
        type: "text",
        defaultValue: null
    },
    markerFontFamily: {
        type: "text",
        defaultValue: "12pt sans-serif"
    },
    markerFontColor: {
        type: "text",
        defaultValue: "black"
    },
    showHeader: {
        type: "boolean",
        defaultValue: true
    },
    showSummary: {
        type: "boolean",
        defaultValue: true
    },
    showFooter: {
        type: "boolean",
        defaultValue: true
    }
};
Exhibit.GoogleMaps2View._accessorSpecs = [{
    accessorName: "getProxy",
    attributeName: "proxy"
}, {
    accessorName: "getLatlng",
    alternatives: [{
        bindings: [{
            attributeName: "latlng",
            types: ["float", "float"],
            bindingNames: ["lat", "lng"]
        }, {
            attributeName: "maxAutoZoom",
            type: "float",
            bindingName: "maxAutoZoom",
            optional: true
        }]
    }, {
        bindings: [{
            attributeName: "lat",
            type: "float",
            bindingName: "lat"
        }, {
            attributeName: "lng",
            type: "float",
            bindingName: "lng"
        }, {
            attributeName: "maxAutoZoom",
            type: "float",
            bindingName: "maxAutoZoom",
            optional: true
        }]
    }]
}, {
    accessorName: "getPolygon",
    attributeName: "polygon",
    type: "text"
}, {
    accessorName: "getPolyline",
    attributeName: "polyline",
    type: "text"
}, {
    accessorName: "getColorKey",
    attributeName: "marker",
    type: "text"
}, {
    accessorName: "getColorKey",
    attributeName: "colorKey",
    type: "text"
}, {
    accessorName: "getSizeKey",
    attributeName: "sizeKey",
    type: "text"
}, {
    accessorName: "getIconKey",
    attributeName: "iconKey",
    type: "text"
}, {
    accessorName: "getIcon",
    attributeName: "icon",
    type: "url"
}];
Exhibit.GoogleMaps2View._initialize = function() {
    console.log("Exhibit.GoogleMaps2View._initialize");
    var links = [],
        rel, canvas;
    if (!Exhibit.MapExtension.initialized) {
        Exhibit.jQuery("head link").each(function(i, el) {
            rel = Exhibit.jQuery(el).attr("rel");
            if (rel.match(/\b(exhibit-map-painter|exhibit\/map-painter)\b/)) {
                Exhibit.MapExtension.markerUrlPrefix = Exhibit.jQuery(el).attr("href") + "?";
            }
        });
        Exhibit.MapExtension.Marker.detectCanvas();
        Exhibit.MapExtension.initialized = true;
    }
};
Exhibit.GoogleMaps2View.create = function(configuration, containerElmt, uiContext) {
    console.log("Exhibit.GoogleMaps2View.create");
    var view = new Exhibit.GoogleMaps2View(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.GoogleMaps2View._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.GoogleMaps2View.createFromDOM = function(configElmt, containerElmt, uiContext) {
    console.log("Exhibit.GoogleMaps2View.createFromDOM ");
    var configuration, view;
    configuration = Exhibit.getConfigurationFromDOM(configElmt);
    view = new Exhibit.GoogleMaps2View(containerElmt !== null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.GoogleMaps2View._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, view.getSettingSpecs(), view._settings);
    Exhibit.GoogleMaps2View._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.GoogleMaps2View._configure = function(view, configuration) {
    console.log("Exhibit.GoogleMaps2View._configure");
    var accessors;
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.GoogleMaps2View._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, view.getSettingSpecs(), view._settings);
    accessors = view._accessors;
    view._getLatlng = accessors.getLatlng !== null ?
    function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getLatlng(proxy, database, visitor);
        });
    } : null;
    view._markerLabelExpression = Exhibit.ExpressionParser.parse(view._settings.markerLabel);
};
Exhibit.GoogleMaps2View.lookupLatLng = function(set, addressExpressionString, outputProperty, outputTextArea, database, accuracy) {
    console.log("Exhibit.GoogleMaps2View.lookupLatLng");
    var expression, jobs, results, geocoder, cont;
    if (typeof accuracy === "undefined" || accuracy === null) {
        accuracy = 4;
    }
    expression = Exhibit.ExpressionParser.parse(addressExpressionString);
    jobs = [];
    set.visit(function(item) {
        var address = expression.evaluateSingle({
            value: item
        }, {
            value: "item"
        }, "value", database).value;
        if (address !== null) {
            jobs.push({
                item: item,
                address: address
            });
        }
    });
    results = [];
    geocoder = new GClientGeocoder();
    cont = function() {
        var job;
        if (jobs.length > 0) {
            job = jobs.shift();
            geocoder.getLocations(job.address, function(json) {
                var coords, lat, lng, segments;
                if (typeof json.Placemark !== "undefined") {
                    json.Placemark.sort(function(p1, p2) {
                        return p2.AddressDetails.Accuracy - p1.AddressDetails.Accuracy;
                    });
                }
                if (typeof json.Placemark !== "undefined" && json.Placemark.length > 0 && json.Placemark[0].AddressDetails.Accuracy >= accuracy) {
                    coords = json.Placemark[0].Point.coordinates;
                    lat = coords[1];
                    lng = coords[0];
                    results.push("\t{ id: '" + job.item + "', " + outputProperty + ": '" + lat + "," + lng + "' }");
                } else {
                    segments = job.address.split(",");
                    if (segments.length === 1) {
                        results.push("\t{ id: '" + job.item + "' }");
                    } else {
                        job.address = segments.slice(1).join(",").replace(/^\s+/, "");
                        jobs.unshift(job);
                    }
                }
                cont();
            });
        } else {
            outputTextArea.value = results.join(",\n");
        }
    };
    cont();
};
Exhibit.GoogleMaps2View.prototype.dispose = function() {
    console.log("Exhibit.GoogleMaps2View.prototype.dispose");
    var view = this;
    Exhibit.jQuery(this.getUIContext().getCollection().getElement()).unbind("onItemsChanged.exhibit", view._onItemsChanged);
    this._map.clearOverlays();
    this._map = null;
    if (this._selectListener !== null) {
        this._selectListener.dispose();
        this._selectListener = null;
    }
    this._itemIDToMarker = null;
    this._dom.dispose();
    this._dom = null;
    this._dispose();
    GUnload();
};
Exhibit.GoogleMaps2View.prototype._internalValidate = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._internalValidate");
    var exhibit, selectCoordinator, self;
    exhibit = this.getUIContext().getMain();
    if (typeof this._accessors.getColorKey !== "undefined" && this._accessors.getColorKey !== null) {
        if (typeof this._settings.colorCoder !== "undefined" && this._settings.colorCoder !== null) {
            this._colorCoder = exhibit.getComponent(this._settings.colorCoder);
        }
        if (typeof this._colorCoder === "undefined" || this._colorCoder === null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this.getUIContext());
        }
    }
    if (typeof this._accessors.getSizeKey !== "undefined" && this._accessors.getSizeKey !== null) {
        if (typeof this._settings.sizeCoder !== "undefined" && this._settings.sizeCoder !== null) {
            this._sizeCoder = exhibit.getComponent(this._settings.sizeCoder);
            if (typeof this._settings.markerScale !== "undefined" && this._settings.markerScale !== null) {
                this._sizeCoder._settings.markerScale = this._settings.markerScale;
            }
        }
    }
    if (typeof this._accessors.getIconKey !== "undefined" && this._accessors.getIconKey !== null) {
        if (typeof this._settings.iconCoder !== "undefined" && this._settings.iconCoder !== null) {
            this._iconCoder = exhibit.getComponent(this._settings.iconCoder);
        }
    }
    if (typeof this._settings.selectCoordinator !== "undefined") {
        selectCoordinator = exhibit.getComponent(this._settings.selectCoordinator);
        if (selectCoordinator !== null) {
            self = this;
            this._selectListener = selectCoordinator.addListener(function(o) {
                self._select(o);
            });
        }
    }
};
Exhibit.GoogleMaps2View.prototype._initializeUI = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._initializeUI");
    var self, legendWidgetSettings, mapDiv;
    self = this;
    legendWidgetSettings = {};
    legendWidgetSettings.colorGradient = (this._colorCoder !== null && typeof this._colorCoder._gradientPoints !== "undefined");
    legendWidgetSettings.colorMarkerGenerator = this._createColorMarkerGenerator();
    legendWidgetSettings.sizeMarkerGenerator = this._createSizeMarkerGenerator();
    legendWidgetSettings.iconMarkerGenerator = this._createIconMarkerGenerator();
    Exhibit.jQuery(this.getContainer()).empty();
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(this.getContainer(), this.getUIContext(), this._settings.showSummary && this._settings.showHeader, {
        onResize: function() {
            self._map.checkResize();
        }
    }, legendWidgetSettings);
    mapDiv = this._dom.plotContainer;
    Exhibit.jQuery(mapDiv).attr("class", "exhibit-mapView-map").css("height", this._settings.mapHeight);
    this._map = this._constructGMap(mapDiv);
    this._reconstruct();
};
Exhibit.GoogleMaps2View.prototype._constructGMap = function(mapDiv) {
    console.log("Exhibit.GoogleMaps2View.prototype._constructGMap");
    var settings, mapOptions, map;
    settings = this._settings;
    if (typeof settings.mapConstructor !== "undefined" && settings.mapConstructor !== null) {
        return settings.mapConstructor(mapDiv);
    } else {
        map = new GMap2(mapDiv);
        map.enableDoubleClickZoom();
        map.enableContinuousZoom();
        map.setCenter(new GLatLng(settings.center[0], settings.center[1]), settings.zoom);
        map.addControl(settings.size === "small" ? new GSmallMapControl() : new GLargeMapControl());
        if (settings.overviewControl) {
            map.addControl(new GOverviewMapControl());
        }
        if (settings.scaleControl) {
            map.addControl(new GScaleControl());
        }
        map.addControl(new GMapTypeControl());
        switch (settings.type) {
        case "normal":
            map.setMapType(G_NORMAL_MAP);
            break;
        case "satellite":
            map.setMapType(G_SATELLITE_MAP);
            break;
        case "hybrid":
            map.setMapType(G_HYBRID_MAP);
            break;
        }
        return map;
    }
};
Exhibit.GoogleMaps2View.prototype._createColorMarkerGenerator = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._createColorMarkerGenerator");
    var settings = this._settings;
    return function(color) {
        return Exhibit.jQuery.simileBubble("createTranslucentImage", Exhibit.MapExtension.Marker.makeIcon(settings.shapeWidth, settings.shapeHeight, color, null, null, settings.iconSize, settings).iconURL, "middle");
    };
};
Exhibit.GoogleMaps2View.prototype._createSizeMarkerGenerator = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._createSizeMarkerGenerator");
    var settings = Exhibit.jQuery.extend({}, this._settings);
    settings.pinHeight = 0;
    return function(iconSize) {
        return Exhibit.jQuery.simileBubble("createTranslucentImage", Exhibit.MapExtension.Marker.makeIcon(settings.shapeWidth, settings.shapeHeight, settings.color, null, null, iconSize, settings).iconURL, "middle");
    };
};
Exhibit.GoogleMaps2View.prototype._createIconMarkerGenerator = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._createIconMarkerGenerator");
    return function(iconURL) {
        var elmt = Exhibit.jQuery("img").attr("src", iconURL).css("vertical-align", "middle").css("height", 40);
        return Exhibit.jQuery(elmt).get(0);
    };
};
Exhibit.GoogleMaps2View.prototype._reconstruct = function() {
    console.log("Exhibit.GoogleMaps2View.prototype._reconstruct");
    var currentSize, unplottableItems;
    this._map.clearOverlays();
    if (typeof this._dom.legendWidget !== "undefined" && this._dom.legendWidget !== null) {
        this._dom.legendWidget.clear();
    }
    if (typeof this._dom.legendGradientWidget !== "undefined" && this._dom.legendWidgetGradient !== null) {
        this._dom.legendGradientWidget.clear();
    }
    this._itemIDToMarker = {};
    currentSize = this.getUIContext().getCollection().countRestrictedItems();
    unplottableItems = [];
    if (currentSize > 0) {
        this._rePlotItems(unplottableItems);
    }
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};
Exhibit.GoogleMaps2View.prototype._rePlotItems = function(unplottableItems) {
    console.log("Exhibit.GoogleMaps2View.prototype._rePlotItems");
    var self, collection, database, settings, accessors, currentSet, locationToData, hasColorKey, hasSizeKey, hasIconKey, hasIcon, hasPoints, hasPolygons, hasPolylines, makeLatLng, bounds, maxAutoZoom, colorCodingFlags, sizeCodingFlags, iconCodingFlags, addMarkerAtLocation, latlngKey, legendWidget, colorCoder, keys, legendGradientWidget, k, key, color, sizeCoder, points, space, i, size, iconCoder, icon, zoom;
    self = this;
    collection = this.getUIContext().getCollection();
    database = this.getUIContext().getDatabase();
    settings = this._settings;
    accessors = this._accessors;
    currentSet = collection.getRestrictedItems();
    locationToData = {};
    hasColorKey = (accessors.getColorKey !== null);
    hasSizeKey = (accessors.getSizeKey !== null);
    hasIconKey = (accessors.getIconKey !== null);
    hasIcon = (accessors.getIcon !== null);
    hasPoints = (this._getLatlng !== null);
    hasPolygons = (accessors.getPolygon !== null);
    hasPolylines = (accessors.getPolyline !== null);
    makeLatLng = (settings.latlngOrder === "latlng") ?
    function(first, second) {
        return new GLatLng(first, second);
    } : function(first, second) {
        return new GLatLng(second, first);
    };
    colorCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    sizeCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    iconCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    bounds = Infinity;
    maxAutoZoom = Infinity;
    currentSet.visit(function(itemID) {
        var latlngs, polygons, polylines, color, colorKeys, sizeKeys, iconKeys, n, latlng, latlngKey, locationData;
        latlngs = [];
        polygons = [];
        polylines = [];
        if (hasPoints) {
            self._getLatlng(itemID, database, function(v) {
                if (v !== null && typeof v.lat !== "undefined" && v.lat !== null && typeof v.lng !== "undefined" && v.lng !== null) {
                    latlngs.push(v);
                }
            });
        }
        if (hasPolygons) {
            accessors.getPolygon(itemID, database, function(v) {
                if (v !== null) {
                    polygons.push(v);
                }
            });
        }
        if (hasPolylines) {
            accessors.getPolyline(itemID, database, function(v) {
                if (v !== null) {
                    polylines.push(v);
                }
            });
        }
        if (latlngs.length > 0 || polygons.length > 0 || polylines.length > 0) {
            color = self._settings.color;
            colorKeys = null;
            if (hasColorKey) {
                colorKeys = new Exhibit.Set();
                accessors.getColorKey(itemID, database, function(v) {
                    colorKeys.add(v);
                });
                color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
            }
            if (latlngs.length > 0) {
                sizeKeys = null;
                if (hasSizeKey) {
                    sizeKeys = new Exhibit.Set();
                    accessors.getSizeKey(itemID, database, function(v) {
                        sizeKeys.add(v);
                    });
                }
                iconKeys = null;
                if (hasIconKey) {
                    iconKeys = new Exhibit.Set();
                    accessors.getIconKey(itemID, database, function(v) {
                        iconKeys.add(v);
                    });
                }
                for (n = 0; n < latlngs.length; n++) {
                    latlng = latlngs[n];
                    latlngKey = latlng.lat + "," + latlng.lng;
                    if (typeof locationToData[latlngKey] !== "undefined") {
                        locationData = locationToData[latlngKey];
                        locationData.items.push(itemID);
                        if (hasColorKey) {
                            locationData.colorKeys.addSet(colorKeys);
                        }
                        if (hasSizeKey) {
                            locationData.sizeKeys.addSet(sizeKeys);
                        }
                        if (hasIconKey) {
                            locationData.iconKeys.addSet(iconKeys);
                        }
                    } else {
                        locationData = {
                            latlng: latlng,
                            items: [itemID]
                        };
                        if (hasColorKey) {
                            locationData.colorKeys = colorKeys;
                        }
                        if (hasSizeKey) {
                            locationData.sizeKeys = sizeKeys;
                        }
                        if (hasIconKey) {
                            locationData.iconKeys = iconKeys;
                        }
                        locationToData[latlngKey] = locationData;
                    }
                }
            }
            for (n = 0; n < polygons.length; n++) {
                self._plotPolygon(itemID, polygons[n], color, makeLatLng);
            }
            for (n = 0; n < polylines.length; n++) {
                self._plotPolyline(itemID, polylines[n], color, makeLatLng);
            }
        } else {
            unplottableItems.push(itemID);
        }
    });
    addMarkerAtLocation = function(locationData) {
        console.log("addMarkerAtLocation");
        var itemCount, shape, color, iconSize, icon, point, marker, x;
        itemCount = locationData.items.length;
        if (typeof bounds === "undefined" || bounds === null || !isFinite(bounds)) {
            bounds = new GLatLngBounds();
        }
        shape = self._settings.shape;
        color = self._settings.color;
        if (hasColorKey) {
            color = self._colorCoder.translateSet(locationData.colorKeys, colorCodingFlags);
        }
        iconSize = self._settings.iconSize;
        if (hasSizeKey) {
            iconSize = self._sizeCoder.translateSet(locationData.sizeKeys, sizeCodingFlags);
        }
        icon = null;
        if (itemCount === 1) {
            if (hasIcon) {
                accessors.getIcon(locationData.items[0], database, function(v) {
                    icon = v;
                });
            }
        }
        if (hasIconKey) {
            icon = self._iconCoder.translateSet(locationData.iconKeys, iconCodingFlags);
        }
        point = new GLatLng(locationData.latlng.lat, locationData.latlng.lng);
        if (typeof locationData.latlng.maxAutoZom !== "undefined" && maxAutoZoom > locationData.latlng.maxAutoZoom) {
            maxAutoZoom = locationData.latlng.maxAutoZoom;
        }
        bounds.extend(point);
        marker = self._makeMarker(point, shape, color, iconSize, icon, itemCount === 1 ? "" : itemCount.toString(), self._settings);
        GEvent.addListener(marker, "click", function() {
            marker.openInfoWindow(self._createInfoWindow(locationData.items));
            if (self._selectListener !== null) {
                self._selectListener.fire({
                    itemIDs: locationData.items
                });
            }
        });
        self._map.addOverlay(marker);
        for (x = 0; x < locationData.items.length; x++) {
            self._itemIDToMarker[locationData.items[x]] = marker;
        }
    };
    try {
        for (latlngKey in locationToData) {
            if (locationToData.hasOwnProperty(latlngKey)) {
                addMarkerAtLocation(locationToData[latlngKey]);
            }
        }
    } catch (e) {
        Exhibit.Debug.exception(e);
    }
    if (hasColorKey) {
        legendWidget = this._dom.legendWidget;
        colorCoder = this._colorCoder;
        keys = colorCodingFlags.keys.toArray().sort();
        if (typeof settings.colorLegendLabel !== "undefined" && settings.colorLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.colorLegendLabel, "color");
        }
        if (typeof colorCoder._gradientPoints !== "undefined" && colorCoder._gradientPoints !== null) {
            legendGradientWidget = this._dom.legendGradientWidget;
            legendGradientWidget.addGradient(this._colorCoder._gradientPoints);
        } else {
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                color = colorCoder.translate(key);
                legendWidget.addEntry(color, key);
            }
        }
        if (colorCodingFlags.others) {
            legendWidget.addEntry(colorCoder.getOthersColor(), colorCoder.getOthersLabel());
        }
        if (colorCodingFlags.mixed && legendWidget) {
            legendWidget.addEntry(colorCoder.getMixedColor(), colorCoder.getMixedLabel());
        }
        if (colorCodingFlags.missing) {
            legendWidget.addEntry(colorCoder.getMissingColor(), colorCoder.getMissingLabel());
        }
    }
    if (hasSizeKey) {
        legendWidget = this._dom.legendWidget;
        sizeCoder = this._sizeCoder;
        keys = sizeCodingFlags.keys.toArray().sort();
        if (typeof settings.sizeLegendLabel !== "undefined" && settings.sizeLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.sizeLegendLabel, "size");
        }
        if (typeof sizeCoder._gradientPoints !== "undefined" && sizeCoder._gradientPoints !== null) {
            points = sizeCoder._gradientPoints;
            space = (points[points.length - 1].value - points[0].value) / 5;
            keys = [];
            for (i = 0; i < 6; i++) {
                keys.push(Math.floor(points[0].value + space * i));
            }
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, "size");
            }
        } else {
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, "size");
            }
            if (sizeCodingFlags.others) {
                legendWidget.addEntry(sizeCoder.getOthersSize(), sizeCoder.getOthersLabel(), "size");
            }
            if (sizeCodingFlags.mixed) {
                legendWidget.addEntry(sizeCoder.getMixedSize(), sizeCoder.getMixedLabel(), "size");
            }
            if (sizeCodingFlags.missing) {
                legendWidget.addEntry(sizeCoder.getMissingSize(), sizeCoder.getMissingLabel(), "size");
            }
        }
    }
    if (hasIconKey) {
        legendWidget = this._dom.legendWidget;
        iconCoder = this._iconCoder;
        keys = iconCodingFlags.keys.toArray().sort();
        if (typeof settings.iconLegendLabel !== "undefined" && settings.iconLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.iconLegendLabel, "icon");
        }
        for (k = 0; k < keys.length; k++) {
            key = keys[k];
            icon = iconCoder.translate(key);
            legendWidget.addEntry(icon, key, "icon");
        }
        if (iconCodingFlags.others) {
            legendWidget.addEntry(iconCoder.getOthersIcon(), iconCoder.getOthersLabel(), "icon");
        }
        if (iconCodingFlags.mixed) {
            legendWidget.addEntry(iconCoder.getMixedIcon(), iconCoder.getMixedLabel(), "icon");
        }
        if (iconCodingFlags.missing) {
            legendWidget.addEntry(iconCoder.getMissingIcon(), iconCoder.getMissingLabel(), "icon");
        }
    }
    if (typeof bounds !== "undefined" && bounds !== null && typeof settings.zoom === "undefined" && !this._shown) {
        zoom = Math.max(0, self._map.getBoundsZoomLevel(bounds) - 1);
        zoom = Math.min(zoom, maxAutoZoom, settings.maxAutoZoom);
        self._map.setZoom(zoom);
    }
    if (typeof bounds !== "undefined" && bounds !== null && typeof settings.center === "undefined" && !this._shown) {
        self._map.setCenter(bounds.getCenter());
    }
    this._shown = true;
};
Exhibit.GoogleMaps2View.prototype._plotPolygon = function(itemID, polygonString, color, makeLatLng) {
    console.log("Exhibit.GoogleMaps2View.prototype._plotPolygon");
    var coords, settings, borderColor, polygon;
    coords = this._parsePolygonOrPolyline(polygonString, makeLatLng);
    if (coords.length > 1) {
        settings = this._settings;
        borderColor = (typeof settings.borderColor !== "undefined" && settings.borderColor !== null) ? settings.borderColor : color;
        polygon = new GPolygon(coords, borderColor, settings.borderWidth, settings.borderOpacity, color, settings.opacity);
        return this._addPolygonOrPolyline(itemID, polygon);
    }
    return null;
};
Exhibit.GoogleMaps2View.prototype._plotPolyline = function(itemID, polylineString, color, makeLatLng) {
    console.log("Exhibit.GoogleMaps2View.prototype._plotPolyline");
    var coords, settings, borderColor, polyline;
    coords = this._parsePolygonOrPolyline(polylineString, makeLatLng);
    if (coords.length > 1) {
        settings = this._settings;
        borderColor = (typeof settings.borderColor !== "undefined" && settings.borderColor !== null) ? settings.borderColor : color;
        polyline = new GPolyline(coords, borderColor, settings.borderWidth, settings.borderOpacity);
        return this._addPolygonOrPolyline(itemID, polyline);
    }
    return null;
};
Exhibit.GoogleMaps2View.prototype._addPolygonOrPolyline = function(itemID, poly) {
    console.log("Exhibit.GoogleMaps2View.prototype._addPolygonOrPolyline");
    var self = this;
    self._map.addOverlay(poly);
    GEvent.addListener(poly, "click", function(p) {
        self._map.openInfoWindow(p, self._createInfoWindow([itemID]));
        if (self._selectListener !== null) {
            self._selectListener.fire({
                itemIDs: [itemID]
            });
        }
    });
    this._itemIDToMarker[itemID] = poly;
    return poly;
};
Exhibit.GoogleMaps2View.prototype._parsePolygonOrPolyline = function(s, makeLatLng) {
    console.log("Exhibit.GoogleMaps2View.prototype._parsePolygonOrPolyline");
    var coords, a, i, pair;
    coords = [];
    a = s.split(this._settings.latlngPairSeparator);
    for (i = 0; i < a.length; i++) {
        pair = a[i].split(",");
        coords.push(makeLatLng(parseFloat(pair[0]), parseFloat(pair[1])));
    }
    return coords;
};
Exhibit.GoogleMaps2View.prototype._select = function(selection) {
    console.log("Exhibit.GoogleMaps2View.prototype._select");
    var itemID, marker;
    itemID = selection.itemIDs[0];
    marker = this._itemIDToMarker[itemID];
    if (typeof marker !== "undefined" && marker !== null) {
        marker.openInfoWindow(this._createInfoWindow([itemID]));
    }
};
Exhibit.GoogleMaps2View.prototype._createInfoWindow = function(items) {
    console.log("Exhibit.GoogleMaps2View.prototype._createInfoWindow");
    return Exhibit.ViewUtilities.fillBubbleWithItems(null, items, this._settings.markerLabelExpression, this.getUIContext());
};
Exhibit.GoogleMaps2View.markerToMap = function(marker, position) {
    console.log("Exhibit.GoogleMaps2View.markerToMap");
    var icon, shadow, gicon;
    icon = marker.getIcon();
    shadow = marker.getShadow();
    gicon = new GIcon();
    gicon.image = icon.url;
    gicon.iconSize = new GSize(icon.size[0], icon.size[1]);
    gicon.iconAnchor = new GPoint(icon.anchor[0], icon.anchor[1]);
    gicon.shadow = shadow.url;
    gicon.shadowSize = new GSize(shadow.size[0], shadow.size[1]);
    gicon.imageMap = marker.getShape().coords;
    gicon.infoWindowAnchor = new GPoint(icon.infoWindowAnchor[0], icon.infoWindowAnchor[1]);
    return new GMarker(position, gicon);
};
Exhibit.GoogleMaps2View.prototype.updateMarkerIcon = function(key, iconURL) {
    console.log("Exhibit.GoogleMaps2View.prototype.updateMarkerIcon");
    var cached;
    cached = this._markerCache[key];
    if (typeof cached !== "undefined" && cached !== null) {
        cached.setImage(iconURL);
    }
};
Exhibit.GoogleMaps2View.prototype._makeMarker = function(position, shape, color, iconSize, iconURL, label, settings) {
    console.log("Exhibit.GoogleMaps2View.prototype._makeMarker");
    var key, cached, marker, gmarker;
    key = Exhibit.MapExtension.Marker._makeMarkerKey(shape, color, iconSize, iconURL, label);
    cached = this._markerCache[key];
    if (typeof cached !== "undefined" && (cached.settings === settings)) {
        gmarker = Exhibit.GoogleMaps2View.markerToMap(cached, position);
    } else {
        marker = Exhibit.MapExtension.Marker.makeMarker(shape, color, iconSize, iconURL, label, settings, this);
        gmarker = Exhibit.GoogleMaps2View.markerToMap(marker, position);
        this._markerCache[key] = gmarker;
    }
    return gmarker;
};
Exhibit.MapView = function(containerElmt, uiContext) {
    console.log("Exhibit.MapView");
    Exhibit.MapView._initialize();
    var view = this;
    Exhibit.jQuery.extend(this, new Exhibit.View("map", containerElmt, uiContext));
    this.addSettingSpecs(Exhibit.MapView._settingSpecs);
    this._overlays = [];
    this._accessors = {
        getProxy: function(itemID, database, visitor) {
            visitor(itemID);
        },
        getColorKey: null,
        getSizeKey: null,
        getIconKey: null,
        getIcon: null
    };
    this._colorCoder = null;
    this._sizeCoder = null;
    this._iconCoder = null;
    this._selectListener = null;
    this._itemIDToMarker = {};
    this._markerLabelExpression = null;
    this._markerCache = {};
    this._shown = false;
    this._onItemsChanged = function() {
        view._reconstruct();
    };
    Exhibit.jQuery(uiContext.getCollection().getElement()).bind("onItemsChanged.exhibit", view._onItemsChanged);
    this.register();
};
Exhibit.MapView._settingSpecs = {
    latlngOrder: {
        type: "enum",
        defaultValue: "latlng",
        choices: ["latlng", "lnglat"]
    },
    latlngPairSeparator: {
        type: "text",
        defaultValue: ";"
    },
    center: {
        type: "float",
        defaultValue: [13.7284, 51.0758],
        dimensions: 2
    },
    zoom: {
        type: "float",
        defaultValue: 2
    },
    autoposition: {
        type: "boolean",
        defaultValue: false
    },
    scrollWheelZoom: {
        type: "boolean",
        defaultValue: true
    },
    size: {
        type: "text",
        defaultValue: "small"
    },
    scaleControl: {
        type: "boolean",
        defaultValue: true
    },
    overviewControl: {
        type: "boolean",
        defaultValue: false
    },
    type: {
        type: "enum",
        defaultValue: "OpenStreetMap",
        choices: ["OpenStreetMap","OpenLayers WMS","GLUES gtopo 30", "GLUES world borders"] //hannes
    },
    bubbleTip: {
        type: "enum",
        defaultValue: "top",
        choices: ["top", "bottom"]
    },
    mapHeight: {
        type: "int",
        defaultValue: 400
    },
    mapConstructor: {
        type: "function",
        defaultValue: null
    },
    markerLabel: {
        type: "text",
        defaultValue: ".label"
    },
    color: {
        type: "text",
        defaultValue: "#FF9000"
    },
    colorCoder: {
        type: "text",
        defaultValue: null
    },
    sizeCoder: {
        type: "text",
        defaultValue: null
    },
    iconCoder: {
        type: "text",
        defaultValue: null
    },
    selectCoordinator: {
        type: "text",
        defaultValue: null
    },
    iconSize: {
        type: "int",
        defaultValue: 0
    },
    iconFit: {
        type: "text",
        defaultValue: "smaller"
    },
    iconScale: {
        type: "float",
        defaultValue: 1
    },
    iconOffsetX: {
        type: "float",
        defaultValue: 0
    },
    iconOffsetY: {
        type: "float",
        defaultValue: 0
    },
    shape: {
        type: "text",
        defaultValue: "circle"
    },
    shapeWidth: {
        type: "int",
        defaultValue: 24
    },
    shapeHeight: {
        type: "int",
        defaultValue: 24
    },
    shapeAlpha: {
        type: "float",
        defaultValue: 0.7
    },
    pin: {
        type: "boolean",
        defaultValue: true
    },
    pinHeight: {
        type: "int",
        defaultValue: 6
    },
    pinWidth: {
        type: "int",
        defaultValue: 6
    },
    borderOpacity: {
        type: "float",
        defaultValue: 0.5
    },
    borderWidth: {
        type: "int",
        defaultValue: 1
    },
    borderColor: {
        type: "text",
        defaultValue: null
    },
    opacity: {
        type: "float",
        defaultValue: 0.7
    },
    sizeLegendLabel: {
        type: "text",
        defaultValue: null
    },
    colorLegendLabel: {
        type: "text",
        defaultValue: null
    },
    iconLegendLabel: {
        type: "text",
        defaultValue: null
    },
    markerScale: {
        type: "text",
        defaultValue: null
    },
    markerFontFamily: {
        type: "text",
        defaultValue: "12pt sans-serif"
    },
    markerFontColor: {
        type: "text",
        defaultValue: "black"
    },
    showHeader: {
        type: "boolean",
        defaultValue: true
    },
    showSummary: {
        type: "boolean",
        defaultValue: true
    },
    showFooter: {
        type: "boolean",
        defaultValue: true
    }
};
Exhibit.MapView._accessorSpecs = [{
    accessorName: "getProxy",
    attributeName: "proxy"
}, {
    accessorName: "getLatlng",
    alternatives: [{
        bindings: [{
            attributeName: "latlng",
            types: ["float", "float"],
            bindingNames: ["lat", "lng"]
        }, {
            attributeName: "maxAutoZoom",
            type: "float",
            bindingName: "maxAutoZoom",
            optional: true
        }]
    }, {
        bindings: [{
            attributeName: "lat",
            type: "float",
            bindingName: "lat"
        }, {
            attributeName: "lng",
            type: "float",
            bindingName: "lng"
        }, {
            attributeName: "maxAutoZoom",
            type: "float",
            bindingName: "maxAutoZoom",
            optional: true
        }]
    }]
}, {
    accessorName: "getPolygon",
    attributeName: "polygon",
    type: "text"
}, {
    accessorName: "getPolyline",
    attributeName: "polyline",
    type: "text"
}, {
    accessorName: "getColorKey",
    attributeName: "marker",
    type: "text"
}, {
    accessorName: "getColorKey",
    attributeName: "colorKey",
    type: "text"
}, {
    accessorName: "getSizeKey",
    attributeName: "sizeKey",
    type: "text"
}, {
    accessorName: "getIconKey",
    attributeName: "iconKey",
    type: "text"
}, {
    accessorName: "getIcon",
    attributeName: "icon",
    type: "url"
}];
Exhibit.MapView._initialize = function() {
    console.log("Exhibit.MapView._initialize");
    if (!Exhibit.MapExtension.initialized) {
        var rel, canvas;
        Exhibit.jQuery("head link").each(function(i, el) {
            rel = Exhibit.jQuery(el).attr("rel");
            if (rel.match(/\b(exhibit-map-painter|exhibit\/map-painter)\b/)) {
                Exhibit.MapExtension.markerUrlPrefix = Exhibit.jQuery(el).attr("href") + "?";
            }
        });
        Exhibit.MapExtension.Marker.detectCanvas();
        Exhibit.MapExtension.initialized = true;
    }
};
Exhibit.MapView.create = function(configuration, containerElmt, uiContext) {
    console.log("Exhibit.MapView.create");
    var view = new Exhibit.MapView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.MapView._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.MapView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    console.log("Exhibit.MapView.createFromDOM");
    var configuration, view;
    configuration = Exhibit.getConfigurationFromDOM(configElmt);
    view = new Exhibit.MapView(containerElmt !== null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.MapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, view.getSettingSpecs(), view._settings);
    Exhibit.MapView._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.MapView._configure = function(view, configuration) {
    console.log("Exhibit.MapView._configure");
    var accessors;
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.MapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, view.getSettingSpecs(), view._settings);
    accessors = view._accessors;
    view._getLatlng = accessors.getLatlng !== null ?
    function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getLatlng(proxy, database, visitor);
        });
    } : null;
    view._markerLabelExpression = Exhibit.ExpressionParser.parse(view._settings.markerLabel);
};
Exhibit.MapView.lookupLatLng = function(set, addressExpressionString, outputProperty, outputTextArea, database, accuracy) {
    console.log("Exhibit.MapView.lookupLatLng");
    var expression, jobs, results, geocoder, cont;
    if (typeof accuracy === "undefined" || accuracy === null) {
        accuracy = 4;
    }
    expression = Exhibit.ExpressionParser.parse(addressExpressionString);
    jobs = [];
    set.visit(function(item) {
        var address = expression.evaluateSingle({
            value: item
        }, {
            value: "item"
        }, "value", database).value;
        if (address !== null) {
            jobs.push({
                item: item,
                address: address
            });
        }
    });
    results = [];
    geocoder = new GClientGeocoder();
    cont = function() {
        var job;
        if (jobs.length > 0) {
            job = jobs.shift();
            geocoder.getLocations(job.address, function(json) {
                var coords, lat, lng, segments;
                if (typeof json.Placemark !== "undefined") {
                    json.Placemark.sort(function(p1, p2) {
                        return p2.AddressDetails.Accuracy - p1.AddressDetails.Accuracy;
                    });
                }
                if (typeof json.Placemark !== "undefined" && json.Placemark.length > 0 && json.Placemark[0].AddressDetails.Accuracy >= accuracy) {
                    coords = json.Placemark[0].Point.coordinates;
                    lat = coords[1];
                    lng = coords[0];
                    results.push("\t{ id: '" + job.item + "', " + outputProperty + ": '" + lat + "," + lng + "' }");
                } else {
                    segments = job.address.split(",");
                    if (segments.length === 1) {
                        results.push("\t{ id: '" + job.item + "' }");
                    } else {
                        job.address = segments.slice(1).join(",").replace(/^\s+/, "");
                        jobs.unshift(job);
                    }
                }
                cont();
            });
        } else {
            outputTextArea.value = results.join(",\n");
        }
    };
    cont();
};
Exhibit.MapView.prototype.dispose = function() {
    console.log("Exhibit.MapView.prototype.dispose");
    var view = this;
    Exhibit.jQuery(this.getUIContext().getCollection().getElement()).unbind("onItemsChanged.exhibit", view._onItemsChanged);
    this._clearOverlays();
    this._map = null;
    if (this._selectListener !== null) {
        this._selectListener.dispose();
        this._selectListener = null;
    }
    this._itemIDToMarker = null;
    this._markerCache = null;
    this._dom.dispose();
    this._dom = null;
    this._dispose();
};
Exhibit.MapView.prototype._internalValidate = function() {
    console.log("Exhibit.MapView.prototype._internalValidate");
    var exhibit, selectCoordinator, self;
    exhibit = this.getUIContext().getMain();
    if (typeof this._accessors.getColorKey !== "undefined" && this._accessors.getColorKey !== null) {
        if (typeof this._settings.colorCoder !== "undefined" && this._settings.colorCoder !== null) {
            this._colorCoder = exhibit.getComponent(this._settings.colorCoder);
        }
        if (typeof this._colorCoder === "undefined" || this._colorCoder === null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this.getUIContext());
        }
    }
    if (typeof this._accessors.getSizeKey !== "undefined" && this._accessors.getSizeKey !== null) {
        if (typeof this._settings.sizeCoder !== "undefined" && this._settings.sizeCoder !== null) {
            this._sizeCoder = exhibit.getComponent(this._settings.sizeCoder);
            if (typeof this._settings.markerScale !== "undefined" && this._settings.markerScale !== null) {
                this._sizeCoder._settings.markerScale = this._settings.markerScale;
            }
        }
    }
    if (typeof this._accessors.getIconKey !== "undefined" && this._accessors.getIconKey !== null) {
        if (typeof this._settings.iconCoder !== "undefined" && this._settings.iconCoder !== null) {
            this._iconCoder = exhibit.getComponent(this._settings.iconCoder);
        }
    }
    if (typeof this._settings.selectCoordinator !== "undefined") {
        selectCoordinator = exhibit.getComponent(this._settings.selectCoordinator);
        if (selectCoordinator !== null) {
            self = this;
            this._selectListener = selectCoordinator.addListener(function(o) {
                self._select(o);
            });
        }
    }
};
Exhibit.MapView.prototype._initializeUI = function() {
    console.log("Exhibit.MapView.prototype._initializeUI");
    var self, legendWidgetSettings, mapDiv;
    self = this;
    legendWidgetSettings = {};
    legendWidgetSettings.colorGradient = (this._colorCoder !== null && typeof this._colorCoder._gradientPoints !== "undefined");
    legendWidgetSettings.colorMarkerGenerator = this._createColorMarkerGenerator();
    legendWidgetSettings.sizeMarkerGenerator = this._createSizeMarkerGenerator();
    legendWidgetSettings.iconMarkerGenerator = this._createIconMarkerGenerator();
    Exhibit.jQuery(this.getContainer()).empty();
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(this.getContainer(), this.getUIContext(), this._settings.showSummary && this._settings.showHeader, {
        onResize: function() {
            google.maps.event.trigger(self._map, "resize");
        }
    }, legendWidgetSettings);
    mapDiv = this._dom.plotContainer;
    Exhibit.jQuery(mapDiv).attr("class", "exhibit-mapView-map").css("height", this._settings.mapHeight);
    this._map = this._constructGMap(mapDiv);
    this._reconstruct();
};
Exhibit.MapView.prototype._constructGMap = function(mapDiv) {
    console.log("Exhibit.MapView.prototype._constructGMap");
    var settings, mapOptions, map;
    settings = this._settings;
    if (typeof settings.mapConstructor !== "undefined" && settings.mapConstructor !== null) {
        return settings.mapConstructor(mapDiv);
    } else {
        console.log(settings.center[0]);

        map = new OpenLayers.Map(mapDiv, {
            projection: new OpenLayers.Projection("EPSG:900913"),
            displayProjection: new OpenLayers.Projection("EPSG:4326")
        });

        layer1 = new OpenLayers.Layer.OSM("OpenStreetMap");

        layer2 = new OpenLayers.Layer.WMS( "OpenLayers WMS",
            "http://vmap0.tiles.osgeo.org/wms/vmap0",
            {layers: 'basic'},{ displayInLayerSwitcher: false} );
    
        layer3 = new OpenLayers.Layer.WMS( "GLUES gtopo 30",
            "http://services1.glues.geo.tu-dresden.de:8080/geoserver/glues/wms",
            {layers: 'glues:gtopo30'},{ displayInLayerSwitcher: true} );
    
        layer4 = new OpenLayers.Layer.WMS( "GLUES world borders",
            "http://services1.glues.geo.tu-dresden.de:8080/geoserver/glues/wms",
            {layers: 'glues:TM_WORLD_BORDERS'},{ displayInLayerSwitcher: true} );
       
        switch (settings.type) {
        case "OpenStreetMap":
            map.addLayer(layer1);
            break;
        case "OpenLayers WMS":
            map.addLayer(layer2);
            break;
        case "GLUES gtopo 30":
            map.addLayer(layer3)
            break;
        case "GLUES world borders":
            map.addLayer(layer4)
            break;

        }
        var lon = 13.7284;
        var lat = 51.0758;
        console.log(lon+" | "+lat);

        map.setCenter(new OpenLayers.LonLat(lon, lat).transform(map.displayProjection, map.projection),1); 
        return map;
    }
};
Exhibit.MapView.prototype._createColorMarkerGenerator = function() {
    console.log("Exhibit.MapView.prototype._createColorMarkerGenerator");
    var settings = this._settings;
    return function(color) {
        return Exhibit.jQuery.simileBubble("createTranslucentImage", Exhibit.MapExtension.Marker.makeIcon(settings.shapeWidth, settings.shapeHeight, color, null, null, settings.iconSize, settings).iconURL, "middle");
    };
};
Exhibit.MapView.prototype._createSizeMarkerGenerator = function() {
    console.log("Exhibit.MapView.prototype._createSizeMarkerGenerator");
    var settings = Exhibit.jQuery.extend({}, this._settings);
    settings.pinHeight = 0;
    return function(iconSize) {
        return Exhibit.jQuery.simileBubble("createTranslucentImage", Exhibit.MapExtension.Marker.makeIcon(settings.shapeWidth, settings.shapeHeight, settings.color, null, null, iconSize, settings).iconURL, "middle");
    };
};
Exhibit.MapView.prototype._createIconMarkerGenerator = function() {
    console.log("Exhibit.MapView.prototype._createIconMarkerGenerator");
    return function(iconURL) {
        var elmt = Exhibit.jQuery("img").attr("src", iconURL).css("vertical-align", "middle").css("height", 40);
        return Exhibit.jQuery(elmt).get(0);
    };
};
Exhibit.MapView.prototype._clearOverlays = function() {
    console.log("Exhibit.MapView.prototype._clearOverlays");
    var i;
    if (typeof this._infoWindow !== "undefined" && this._infoWindow !== null) {
        this._infoWindow.setMap(null);
    }
    for (i = 0; i < this._overlays.length; i++) {
        this._overlays[i].setMap(null);
    }
    this._overlays = [];
};
Exhibit.MapView.prototype._reconstruct = function() {
    console.log("Exhibit.MapView.prototype._reconstruct");
    var currentSize, unplottableItems;
    this._clearOverlays();
    if (typeof this._dom.legendWidget !== "undefined" && this._dom.legendWidget !== null) {
        this._dom.legendWidget.clear();
    }
    if (typeof this._dom.legendGradientWidget !== "undefined" && this._dom.legendWidgetGradient !== null) {
        this._dom.legendGradientWidget.reconstruct();
    }
    this._itemIDToMarker = {};
    currentSize = this.getUIContext().getCollection().countRestrictedItems();
    unplottableItems = [];
    if (currentSize > 0) {
        this._rePlotItems(unplottableItems);
    }
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};
Exhibit.MapView.prototype._rePlotItems = function(unplottableItems) {
    console.log("Exhibit.MapView.prototype._rePlotItems");
    var self, collection, database, settings, accessors, currentSet, locationToData, hasColorKey, hasSizeKey, hasIconKey, hasIcon, hasPoints, hasPolygons, hasPolylines, makeLatLng, bounds, maxAutoZoom, colorCodingFlags, sizeCodingFlags, iconCodingFlags, addMarkerAtLocation, latlngKey, legendWidget, colorCoder, keys, legendGradientWidget, k, key, color, sizeCoder, points, space, i, size, iconCoder, icon;
    self = this;
    collection = this.getUIContext().getCollection();
    database = this.getUIContext().getDatabase();
    settings = this._settings;
    accessors = this._accessors;
    currentSet = collection.getRestrictedItems();
    locationToData = {};
    hasColorKey = (accessors.getColorKey !== null);
    hasSizeKey = (accessors.getSizeKey !== null);
    hasIconKey = (accessors.getIconKey !== null);
    hasIcon = (accessors.getIcon !== null);
    hasPoints = (this._getLatlng !== null);
    hasPolygons = (accessors.getPolygon !== null);
    hasPolylines = (accessors.getPolyline !== null);
    makeLatLng = (settings.latlngOrder === "latlng") ?
    function(first, second) {
        return new google.maps.LatLng(first, second);
    } : function(first, second) {
        return new google.maps.LatLng(second, first);
    };
    colorCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    sizeCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    iconCodingFlags = {
        mixed: false,
        missing: false,
        others: false,
        keys: new Exhibit.Set()
    };
    bounds = Infinity;
    maxAutoZoom = Infinity;
    currentSet.visit(function(itemID) {
        var latlngs, polygons, polylines, color, colorKeys, sizeKeys, iconKeys, n, latlng, latlngKey, locationData, p;
        latlngs = [];
        polygons = [];
        polylines = [];
        if (hasPoints) {
            self._getLatlng(itemID, database, function(v) {
                if (v !== null && typeof v.lat !== "undefined" && v.lat !== null && typeof v.lng !== "undefined" && v.lng !== null) {
                    latlngs.push(v);
                }
            });
        }
        if (hasPolygons) {
            accessors.getPolygon(itemID, database, function(v) {
                if (v !== null) {
                    polygons.push(v);
                }
            });
        }
        if (hasPolylines) {
            accessors.getPolyline(itemID, database, function(v) {
                if (v !== null) {
                    polylines.push(v);
                }
            });
        }
        if (latlngs.length > 0 || polygons.length > 0 || polylines.length > 0) {
            color = self._settings.color;
            colorKeys = null;
            if (hasColorKey) {
                colorKeys = new Exhibit.Set();
                accessors.getColorKey(itemID, database, function(v) {
                    colorKeys.add(v);
                });
                color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
            }
            if (latlngs.length > 0) {
                sizeKeys = null;
                if (hasSizeKey) {
                    sizeKeys = new Exhibit.Set();
                    accessors.getSizeKey(itemID, database, function(v) {
                        sizeKeys.add(v);
                    });
                }
                iconKeys = null;
                if (hasIconKey) {
                    iconKeys = new Exhibit.Set();
                    accessors.getIconKey(itemID, database, function(v) {
                        iconKeys.add(v);
                    });
                }
                for (n = 0; n < latlngs.length; n++) {
                    latlng = latlngs[n];
                    latlngKey = latlng.lat + "," + latlng.lng;
                    if (typeof locationToData[latlngKey] !== "undefined") {
                        locationData = locationToData[latlngKey];
                        locationData.items.push(itemID);
                        if (hasColorKey) {
                            locationData.colorKeys.addSet(colorKeys);
                        }
                        if (hasSizeKey) {
                            locationData.sizeKeys.addSet(sizeKeys);
                        }
                        if (hasIconKey) {
                            locationData.iconKeys.addSet(iconKeys);
                        }
                    } else {
                        locationData = {
                            latlng: latlng,
                            items: [itemID]
                        };
                        if (hasColorKey) {
                            locationData.colorKeys = colorKeys;
                        }
                        if (hasSizeKey) {
                            locationData.sizeKeys = sizeKeys;
                        }
                        if (hasIconKey) {
                            locationData.iconKeys = iconKeys;
                        }
                        locationToData[latlngKey] = locationData;
                    }
                }
            }
            for (n = 0; n < polygons.length; n++) {
                self._plotPolygon(itemID, polygons[n], color, makeLatLng);
            }
            for (n = 0; n < polylines.length; n++) {
                self._plotPolyline(itemID, polylines[n], color, makeLatLng);
            }
        } else {
            unplottableItems.push(itemID);
        }
    });
    addMarkerAtLocation = function(locationData) {
        console.log("addMarkerAtLocation");
        var itemCount, shape, color, iconSize, icon, point, marker, x;
        itemCount = locationData.items.length;
        if (typeof bounds === "undefined" || bounds === null || !isFinite(bounds)) {
            bounds = new google.maps.LatLngBounds();
        }
        shape = self._settings.shape;
        color = self._settings.color;
        if (hasColorKey) {
            color = self._colorCoder.translateSet(locationData.colorKeys, colorCodingFlags);
        }
        iconSize = self._settings.iconSize;
        if (hasSizeKey) {
            iconSize = self._sizeCoder.translateSet(locationData.sizeKeys, sizeCodingFlags);
        }
        icon = null;
        if (itemCount === 1) {
            if (hasIcon) {
                accessors.getIcon(locationData.items[0], database, function(v) {
                    icon = v;
                });
            }
        }
        if (hasIconKey) {
            icon = self._iconCoder.translateSet(locationData.iconKeys, iconCodingFlags);
        }
        point = new google.maps.LatLng(locationData.latlng.lat, locationData.latlng.lng);
        if (typeof locationData.latlng.maxAutoZoom !== "undefined" && maxAutoZoom > locationData.latlng.maxAutoZoom) {
            maxAutoZoom = locationData.latlng.maxAutoZoom;
        }
        bounds.extend(point);
        marker = self._makeMarker(point, shape, color, iconSize, icon, itemCount === 1 ? "" : itemCount.toString(), self._settings);
        google.maps.event.addListener(marker, "click", function() {
            self._showInfoWindow(locationData.items, null, marker);
            if (self._selectListener !== null) {
                self._selectListener.fire({
                    itemIDs: locationData.items
                });
            }
        });
        marker.setMap(self._map);
        self._overlays.push(marker);
        for (x = 0; x < locationData.items.length; x++) {
            self._itemIDToMarker[locationData.items[x]] = marker;
        }
    };
    try {
        for (latlngKey in locationToData) {
            if (locationToData.hasOwnProperty(latlngKey)) {
                addMarkerAtLocation(locationToData[latlngKey]);
            }
        }
    } catch (e) {
        Exhibit.Debug.exception(e);
    }
    if (hasColorKey) {
        legendWidget = this._dom.legendWidget;
        colorCoder = this._colorCoder;
        keys = colorCodingFlags.keys.toArray().sort();
        if (typeof colorCoder._gradientPoints !== "undefined" && colorCoder._gradientPoints !== null) {
            legendGradientWidget = this._dom.legendGradientWidget;
            legendGradientWidget.addGradient(this._colorCoder._gradientPoints);
            if (typeof settings.colorLegendLabel !== "undefined" && settings.colorLegendLabel !== null) {
                legendGradientWidget.addLegendLabel(settings.colorLegendLabel);
            }
        } else {
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                color = colorCoder.translate(key);
                legendWidget.addEntry(color, key);
            }
            if (typeof settings.colorLegendLabel !== "undefined" && settings.colorLegendLabel !== null) {
                legendWidget.addLegendLabel(settings.colorLegendLabel, "color");
            }
        }
        if (colorCodingFlags.others) {
            legendWidget.addEntry(colorCoder.getOthersColor(), colorCoder.getOthersLabel());
        }
        if (colorCodingFlags.mixed && legendWidget) {
            legendWidget.addEntry(colorCoder.getMixedColor(), colorCoder.getMixedLabel());
        }
        if (colorCodingFlags.missing) {
            legendWidget.addEntry(colorCoder.getMissingColor(), colorCoder.getMissingLabel());
        }
    }
    if (hasSizeKey) {
        legendWidget = this._dom.legendWidget;
        sizeCoder = this._sizeCoder;
        keys = sizeCodingFlags.keys.toArray().sort();
        if (typeof settings.sizeLegendLabel !== "undefined" && settings.sizeLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.sizeLegendLabel, "size");
        }
        if (typeof sizeCoder._gradientPoints !== "undefined" && sizeCoder._gradientPoints !== null) {
            points = sizeCoder._gradientPoints;
            space = (points[points.length - 1].value - points[0].value) / 5;
            keys = [];
            for (i = 0; i < 6; i++) {
                keys.push(Math.floor(points[0].value + space * i));
            }
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, "size");
            }
        } else {
            for (k = 0; k < keys.length; k++) {
                key = keys[k];
                size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, "size");
            }
            if (sizeCodingFlags.others) {
                legendWidget.addEntry(sizeCoder.getOthersSize(), sizeCoder.getOthersLabel(), "size");
            }
            if (sizeCodingFlags.mixed) {
                legendWidget.addEntry(sizeCoder.getMixedSize(), sizeCoder.getMixedLabel(), "size");
            }
            if (sizeCodingFlags.missing) {
                legendWidget.addEntry(sizeCoder.getMissingSize(), sizeCoder.getMissingLabel(), "size");
            }
        }
    }
    if (hasIconKey) {
        legendWidget = this._dom.legendWidget;
        iconCoder = this._iconCoder;
        keys = iconCodingFlags.keys.toArray().sort();
        if (typeof settings.iconLegendLabel !== "undefined" && settings.iconLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.iconLegendLabel, "icon");
        }
        for (k = 0; k < keys.length; k++) {
            key = keys[k];
            icon = iconCoder.translate(key);
            legendWidget.addEntry(icon, key, "icon");
        }
        if (iconCodingFlags.others) {
            legendWidget.addEntry(iconCoder.getOthersIcon(), iconCoder.getOthersLabel(), "icon");
        }
        if (iconCodingFlags.mixed) {
            legendWidget.addEntry(iconCoder.getMixedIcon(), iconCoder.getMixedLabel(), "icon");
        }
        if (iconCodingFlags.missing) {
            legendWidget.addEntry(iconCoder.getMissingIcon(), iconCoder.getMissingLabel(), "icon");
        }
    }
    if (typeof bounds !== "undefined" && bounds !== null && settings.autoposition && !this._shown) {
        self._map.fitBounds(bounds);
        if (self._map.getZoom > maxAutoZoom) {
            self._map_setZoom(maxAutoZoom);
        }
    }
    this._shown = true;
};
Exhibit.MapView.prototype._plotPolygon = function(itemID, polygonString, color, makeLatLng) {
    console.log("Exhibit.MapView.prototype._plotPolygon");
    var coords, settings, borderColor, polygon;
    coords = this._parsePolygonOrPolyline(polygonString, makeLatLng);
    if (coords.length > 1) {
        settings = this._settings;
        borderColor = (typeof settings.borderColor !== "undefined" && settings.borderColor !== null) ? settings.borderColor : color;
        polygon = new google.maps.Polygon({
            paths: coords,
            strokeColor: borderColor,
            strokeWeight: settings.borderWidth,
            strokeOpacity: settings.borderOpacity,
            fillColor: color,
            fillOpacity: settings.opacity
        });
        return this._addPolygonOrPolyline(itemID, polygon);
    }
    return null;
};
Exhibit.MapView.prototype._plotPolyline = function(itemID, polylineString, color, makeLatLng) {
    console.log("Exhibit.MapView.prototype._plotPolyline");
    var coords, settings, borderColor, polyline;
    coords = this._parsePolygonOrPolyline(polylineString, makeLatLng);
    if (coords.length > 1) {
        settings = this._settings;
        borderColor = (typeof settings.borderColor !== "undefined" && settings.borderColor !== null) ? settings.borderColor : color;
        polyline = new google.maps.Polyline({
            path: coords,
            strokeColor: borderColor,
            strokeWeight: settings.borderWidth,
            strokeOpacity: settings.borderOpacity
        });
        return this._addPolygonOrPolyline(itemID, polyline);
    }
    return null;
};
Exhibit.MapView.prototype._addPolygonOrPolyline = function(itemID, poly) {
    console.log("Exhibit.MapView.prototype._addPolygonOrPolyline");
    var self, onclick;
    poly.setMap(this._map);
    this._overlays.push(poly);
    self = this;
    onclick = function(evt) {
        self._showInfoWindow([itemID], evt.latLng);
        if (self._selectListener !== null) {
            self._selectListener.fire({
                itemIDs: [itemID]
            });
        }
    };
    google.maps.event.addListener(poly, "click", onclick);
    this._itemIDToMarker[itemID] = poly;
    return poly;
};
Exhibit.MapView.prototype._parsePolygonOrPolyline = function(s, makeLatLng) {
    console.log("Exhibit.MapView.prototype._parsePolygonOrPolyline");
    var coords, a, i, pair;
    coords = [];
    a = s.split(this._settings.latlngPairSeparator);
    for (i = 0; i < a.length; i++) {
        pair = a[i].split(",");
        coords.push(makeLatLng(parseFloat(pair[0]), parseFloat(pair[1])));
    }
    return coords;
};
Exhibit.MapView.prototype._select = function(selection) {
    console.log("Exhibit.MapView.prototype._select");
    var itemID, marker;
    itemID = selection.itemIDs[0];
    marker = this._itemIDToMarker[itemID];
    if (typeof marker !== "undefined" && marker !== null) {
        this._showInfoWindow([itemID], null, marker);
    }
};
Exhibit.MapView.prototype._showInfoWindow = function(items, pos, marker) {
    console.log("Exhibit.MapView.prototype._showInfoWindow");
    var content, win, markerSize, winAnchor;
    if (typeof this._infoWindow !== "undefined" && this._infoWindow !== null) {
        this._infoWindow.setMap(null);
    }
    content = this._createInfoWindow(items);
    markerSize = marker.getIcon().size;
    winAnchor = new google.maps.Size(0, (this._settings.bubbleTip === "bottom") ? markerSize.height : 0);
    win = new google.maps.InfoWindow({
        content: content,
        pixelOffset: winAnchor
    });
    if (typeof pos !== "undefined" && pos !== null) {
        win.setPosition(pos);
    }
    win.open(this._map, marker);
    this._infoWindow = win;
};
Exhibit.MapView.prototype._createInfoWindow = function(items) {
    console.log("Exhibit.MapView.prototype._createInfoWindow");
    return Exhibit.ViewUtilities.fillBubbleWithItems(null, items, this._markerLabelExpression, this.getUIContext());
};
Exhibit.MapView.markerToMap = function(marker, position) {
    console.log("Exhibit.MapView.markerToMap");
    var icon, shadow;
    icon = marker.getIcon();
    shadow = marker.getShadow();
    return new google.maps.Marker({
        icon: new google.maps.MarkerImage(icon.url, new google.maps.Size(icon.size[0], icon.size[1]), null, new google.maps.Point(icon.anchor[0], icon.anchor[1]), null),
        shadow: new google.maps.MarkerImage(shadow.url, new google.maps.Size(shadow.size[0], shadow.size[1]), null, new google.maps.Point(shadow.anchor[0], shadow.anchor[1]), null),
        shape: marker.getShape(),
        position: position
    });
};
Exhibit.MapView.prototype.updateMarkerIcon = function(key, iconURL) {
    console.log("Exhibit.MapView.prototype.updateMarkerIcon");
    var cached;
    cached = this._markerCache[key];
    if (typeof cached !== "undefined" && cached !== null) {
        cached.setIcon(iconURL);
    }
};
Exhibit.MapView.prototype._makeMarker = function(position, shape, color, iconSize, iconURL, label, settings) {
    console.log("Exhibit.MapView.prototype._makeMarker");
    var key, cached, marker, gmarker;
    key = Exhibit.MapExtension.Marker._makeMarkerKey(shape, color, iconSize, iconURL, label);
    cached = this._markerCache[key];
    if (typeof cached !== "undefined" && (cached.settings === settings)) {
        gmarker = Exhibit.MapView.markerToMap(cached, position);
    } else {
        marker = Exhibit.MapExtension.Marker.makeMarker(shape, color, iconSize, iconURL, label, settings, this);
        gmarker = Exhibit.MapView.markerToMap(marker, position);
        this._markerCache[key] = gmarker;
    }
    return gmarker;
};
Exhibit.MapExtension.Marker = function(icon, shadow, shape, settings) {
    console.log("Exhibit.MapExtension.Marker");
    this.icon = icon;
    this.shadow = shadow;
    this.shape = shape;
    this.settings = settings;
};
Exhibit.MapExtension.Marker.detectCanvas = function() {
    console.log("Exhibit.MapExtension.Marker.detectCanvas");
    var canvas = Exhibit.jQuery("<canvas>");
    Exhibit.MapExtension.hasCanvas = (typeof canvas.get(0).getContext !== "undefined" && canvas.get(0).getContext("2d") !== null);
    canvas = null;
};
Exhibit.MapExtension.Marker.makeIcon = function(width, height, color, label, icon, size, settings) {
    console.log("Exhibit.MapExtension.Marker.makeIcon");
    return (Exhibit.MapExtension.hasCanvas) ? Exhibit.MapExtension.Canvas.makeIcon(width, height, color, label, icon, size, settings) : Exhibit.MapExtension.Painter.makeIcon(width, height, color, label, icon, size, settings);
};
Exhibit.MapExtension.Marker._makeMarkerKey = function(shape, color, iconSize, iconURL, label) {
    console.log("Exhibit.MapExtension.Marker._makeMarkerKey");
    return "#" + [shape, color, iconSize, iconURL, label].join("#");
};
Exhibit.MapExtension.Marker.makeMarker = function(shape, color, iconSize, iconURL, label, settings, view) {
    console.log("Exhibit.MapExtension.Marker.makeMarker");
    var extra, halfWidth, bodyHeight, width, height, pin, markerImage, markerShape, shadowImage, pinHeight, pinHalfWidth, markerPair, marker, image, resolver;
    extra = label.length * 3;
    halfWidth = Math.ceil(settings.shapeWidth / 2) + extra;
    bodyHeight = settings.shapeHeight + 2 * extra;
    width = halfWidth * 2;
    height = bodyHeight;
    pin = settings.pin;
    if (iconSize > 0) {
        width = iconSize;
        halfWidth = Math.ceil(iconSize / 2);
        height = iconSize;
        bodyHeight = iconSize;
    }
    markerImage = {
        anchor: null,
        size: null,
        url: null
    };
    markerShape = {
        type: "poly",
        coords: null
    };
    shadowImage = {
        anchor: null,
        size: null,
        url: null
    };
    if (pin) {
        pinHeight = settings.pinHeight;
        pinHalfWidth = Math.ceil(settings.pinWidth / 2);
        height += pinHeight;
        markerImage.anchor = [halfWidth, height];
        shadowImage.anchor = [halfWidth, height];
        markerShape.coords = [0, 0, 0, bodyHeight, halfWidth - pinHalfWidth, bodyHeight, halfWidth, height, halfWidth + pinHalfWidth, bodyHeight, width, bodyHeight, width, 0];
        markerImage.infoWindowAnchor = (settings.bubbleTip === "bottom") ? [halfWidth, height] : [halfWidth, 0];
    } else {
        markerImage.anchor = [halfWidth, Math.ceil(height / 2)];
        shadowImage.anchor = [halfWidth, Math.ceil(height / 2)];
        markerShape.coords = [0, 0, 0, bodyHeight, width, bodyHeight, width, 0];
        markerImage.infoWindowAnchor = [halfWidth, 0];
    }
    markerImage.size = [width, height];
    shadowImage.size = [width + height / 2, height];
    if (!Exhibit.MapExtension.hasCanvas) {
        markerPair = Exhibit.MapExtension.Painter.makeIcon(width, bodyHeight, color, label, iconURL, iconSize, settings);
    } else {
        markerPair = Exhibit.MapExtension.Canvas.makeIcon(width, bodyHeight, color, label, null, iconSize, settings);
    }
    markerImage.url = markerPair.iconURL;
    shadowImage.url = markerPair.shadowURL;
    marker = new Exhibit.MapExtension.Marker(markerImage, shadowImage, markerShape, settings);
    if (iconURL !== null) {
        image = new Image();
        Exhibit.jQuery(image).one("load error", function(evt) {
            var url, icon, key;
            if (evt.type !== "error") {
                try {
                    url = Exhibit.MapExtension.Canvas.makeIcon(width, bodyHeight, color, label, image, iconSize, settings).iconURL;
                } catch (e) {
                    if (!Exhibit.MapExtension._CORSWarned) {
                        Exhibit.MapExtension._CORSWarned = true;
                        Exhibit.Debug.warn(Exhibit._("%MapView.error.remoteImage", iconURL));
                    }
                    url = Exhibit.MapExtension.Painter.makeIcon(width, bodyHeight, color, label, iconURL, iconSize, settings).iconURL;
                }
                key = Exhibit.MapExtension.Marker._makeMarkerKey(shape, color, iconSize, iconURL, label);
                view.updateMarkerIcon(key, url);
            }
        }).attr("src", iconURL);
    }
    return marker;
};
Exhibit.MapExtension.Marker.prototype.hasShadow = function() {
    console.log("Exhibit.MapExtension.Marker.prototype.hasShadow");
    return this.shadow !== null;
};
Exhibit.MapExtension.Marker.prototype.setIcon = function(icon) {
    this.icon = icon;
};
Exhibit.MapExtension.Marker.prototype.getIcon = function() {
    return this.icon;
};
Exhibit.MapExtension.Marker.prototype.setShadow = function(shadow) {
    this.shadow = shadow;
};
Exhibit.MapExtension.Marker.prototype.getShadow = function() {
    return this.shadow;
};
Exhibit.MapExtension.Marker.prototype.setShape = function(shape) {
    this.shape = shape;
};
Exhibit.MapExtension.Marker.prototype.getShape = function() {
    return this.shape;
};
Exhibit.MapExtension.Marker.prototype.setSettings = function(settings) {
    this.settings = settings;
};
Exhibit.MapExtension.Marker.prototype.getSettings = function() {
    return this.settings;
};
Exhibit.MapExtension.Marker.prototype.dispose = function() {
    this.icon = null;
    this.shadow = null;
    this.shape = null;
    this.settings = null;
};
Exhibit.MapExtension.Painter = {};
Exhibit.MapExtension.Painter.makeIcon = function(width, height, color, label, iconURL, iconSize, settings) {
    var imageParameters, shadowParameters, pinParameters, pinHeight, pinHalfWidth;
    if (iconSize > 0) {
        width = iconSize;
        height = iconSize;
        settings.pin = false;
    }
    imageParameters = ["renderer=map-marker", "shape=" + settings.shape, "alpha=" + settings.shapeAlpha, "width=" + width, "height=" + height, "background=" + color.substr(1), "label=" + label];
    shadowParameters = ["renderer=map-marker-shadow", "shape=" + settings.shape, "width=" + width, "height=" + height];
    pinParameters = [];
    if (settings.pin && iconSize <= 0) {
        pinHeight = settings.pinHeight;
        pinHalfWidth = Math.ceil(settings.pinWidth / 2);
        pinParameters.push("pinHeight=" + pinHeight);
        pinParameters.push("pinWidth=" + (pinHalfWidth * 2));
    } else {
        pinParameters.push("pin=false");
    }
    if (iconURL !== null) {
        imageParameters.push("icon=" + iconURL);
        if (settings.iconFit !== "smaller") {
            imageParameters.push("iconFit=" + settings.iconFit);
        }
        if (settings.iconScale !== 1) {
            imageParameters.push("iconScale=" + settings.iconScale);
        }
        if (settings.iconOffsetX !== 1) {
            imageParameters.push("iconX=" + settings.iconOffsetX);
        }
        if (settings.iconOffsetY !== 1) {
            imageParameters.push("iconY=" + settings.iconOffsetY);
        }
    }
    return {
        iconURL: Exhibit.MapExtension.markerUrlPrefix + imageParameters.concat(pinParameters).join("&") + "&.png",
        shadowURL: Exhibit.MapExtension.markerUrlPrefix + shadowParameters.concat(pinParameters).join("&") + "&.png"
    };
};