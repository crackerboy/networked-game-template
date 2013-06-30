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

    //Returns array of properties that differ
    function propertyDiff(obj1, obj2) {

        //TODO optimize, unnecessary double pass

        function diff(_obj1, _obj2) {
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

        logic.init(cloneData());
        visual.init(cloneData());


        var t = 0;
        setInterval(function () {

            t++;

            if (t % C.pollFrequency === 0) {
                dataio.request();
            }

            var newData = logic.loop(cloneData());

            // Check newData for differences, then send updates to
            // server

            _.each(newData, function (node, id) {
                if (!_.isEqual(node, mediator.data[id])) {
                    pendingUpdates[id] = _.union(pendingUpdates[id] || [], propertyDiff(node, mediator.data[id]));
                }
            });

            mediator.data = newData;

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