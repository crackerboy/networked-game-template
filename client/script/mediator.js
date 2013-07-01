/*global window, dataio, visual, logic, C, _*/


/*

The Mediator controls module coordination in the game

The modules being coordinated are dataio, logic, and visual

The mediator controls the central data, which is readonly but can be changed
by modules if they query the mediator

*/

var mediator = (function () {

    var pendingUpdates = {};

    function cloneData() {
        return JSON.parse(JSON.stringify(mediator.data));
    }

    function updateLocalData(newData) {
        // Check newData for differences, then send updates to
        // server

        _.each(newData, function (node, id) {
            if (node == null){
                delete newData[id];
            } else {
                if (!_.isEqual(node, mediator.data[id])) {
                    pendingUpdates[id] = _.union(pendingUpdates[id] || [], propertyDiff(node, mediator.data[id]));
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
    }

    //Returns array of properties that differ
    function propertyDiff(obj1, obj2) {

        //TODO optimize, unnecessary double pass

        function diff(_obj1, _obj2) {

            if (_obj1 == null){
                return _.keys(_obj2);
            }

            if (_obj2 == null){
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

    function initLoop() {

        updateLocalData(logic.init(cloneData()));
        visual.init(cloneData());


        var t = 0;
        setInterval(function () {

            t++;

            if (t % C.pollFrequency === 0) {
                dataio.request();
            }

            updateLocalData(logic.loop(cloneData()));

            if (t % C.updateFrequency === 0) {
                _.each(pendingUpdates, function (properties, id) {
                    dataio.update(id, properties);
                });

                pendingUpdates = {};
            }

            visual.loop(cloneData());


        }, 1000 / 30);

    }

    function init() {

        console.log("Game Initialized");

        dataio.getMaster(initLoop);

    }

    return {
        init: init,
        data: {},
        cloneData: cloneData
    };

}());


window.onload = mediator.init();