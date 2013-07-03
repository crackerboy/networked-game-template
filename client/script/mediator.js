/*global window, dataio, visual, logic, C, _*/


/*

The Mediator controls module coordination in the game

The modules being coordinated are dataio, logic, and visual

The mediator controls the central data, which is readonly but can be changed
by modules if they query the mediator

*/

var mediator = (function () {

    var pendingUpdates = {};
    var localData = {};

    function cloneData() {
        return JSON.parse(JSON.stringify(mediator.data));
    }

    //Returns array of properties that differ
    function propertyDiff(obj1, obj2) {

        //TODO optimize, unnecessary double pass

        function diff(_obj1, _obj2) {

            if (!_obj1) {
                return _.keys(_obj2);
            }

            if (!_obj2) {
                return _.keys(_obj1);
            }

            //Check for differing properties
            var props = [], p;
            for (p in _obj1) {
                if (_obj1.hasOwnProperty(p)) {
                    if (_obj1[p] !== _obj2[p]) {
                        props.push(p);
                    }
                }
            }
            return props;
        }

        return _.union(diff(obj1, obj2), diff(obj2, obj1));
    }

    function updateLocalMaster(newData) {
        // Check newData for differences, then send updates to
        // server

        // Immediate changes in this update
        var changes = {};

        _.each(newData, function (node, id) {
            if (!node) {
                changes[id] = null;
                delete newData[id];
            } else {
                if (!_.isEqual(node, mediator.data[id])) {

                    // Get property difference between objects
                    var differentProperties = propertyDiff(node, mediator.data[id]);

                    changes[id] = differentProperties;

                    pendingUpdates[id] = _.union(pendingUpdates[id] || [], differentProperties);

                }
            }
        });

        //Determine which nodes have been lost
        //TODO tremendously inefficient

        var newNodes = _.keys(newData);
        var oldNodes = _.keys(mediator.data);
        var allNodes = _.union(newNodes, oldNodes);

        var addNodes = _.difference(allNodes, newNodes);

        _.each(addNodes, function (nodeID) {
            pendingUpdates[nodeID] = ["remove"];
        });

        mediator.data = newData;

        return changes;
    }

    function initLoop() {

        updateLocalMaster(logic.init(cloneData(), localData));
        visual.init(cloneData());


        var t = 0;
        setInterval(function () {

            t++;

            // Poll for updates

            if (t % C.pollFrequency === 0) {
                dataio.request();
            }

            // Check for server changes

            var changes = {};

            if (mediator.pendingChanges) {
                changes = mediator.pendingChanges;
                mediator.pendingChanges = null;
            }

            // Run logic

            var localMasterChanges = updateLocalMaster(logic.loop(cloneData(), localData, changes));

            // Merge changes and localMasterChanges so visual has all changes

            changes = _.extend(localMasterChanges,changes);

            _.each(localMasterChanges, function (properties, nodeID) {

                if (changes[nodeID]) {
                    changes[nodeID] = _.union(properties, changes[nodeID]);
                }

            });

            // Send accumulated updates to server on interval

            if (t % C.updateFrequency === 0) {
                _.each(pendingUpdates, function (properties, id) {
                    dataio.update(id, properties);
                });

                pendingUpdates = {};
            }

            // Render

            visual.loop(cloneData(), localData, changes);


        }, 1000 / 30);

    }

    function init() {

        console.log("Game Initialized");

        dataio.getMaster(initLoop);

    }

    return {
        init: init,
        data: {},
        cloneData: cloneData,
        pendingChanges: {} // Refers to local or server changes to data for modules
    };

}());


window.onload = mediator.init();