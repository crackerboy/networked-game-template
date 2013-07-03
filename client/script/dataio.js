/*global majaX */
/*
    Dataio handles server communication and updating

    function getMaster ( [function callback] )

        Polls the server for the "master" copy of the data, then
        sets the mediator's data to the master copy.

        This is generally done once at the beginning of the game.

    function update ( string node , [string property] )

        Updates node on server with client's node properties

        Example)
        ------------------------------
            Server Data

        {
            "zombie" : {
                
                "health" : 100,
                "damage" : 10

            }
        }

            Client Data

        {
            "zombie" : {
                
                "health" : 50,
                "damage" : 5

            }
        }

        ------------------------------
            Query

        update("zombie", ["health","damage"]);
        ------------------------------
            New Server Data

        {
            "zombie" : {
                
                "health" : 50,
                "damage" : 5

            }
        }
        ------------------------------

    function request ()

        Requests all updates from server since currentQueryCount,
        then sends the updates to the mediator.

        This is generally called every X seconds and keeps the
        client master up to date.
*/

var dataio = (function () {

    var currentQueryCount;

    function encode(value) {
        if (typeof value === "number" || typeof value === "string") {
            return value;
        }
        return JSON.stringify(value);
    }

    function decode(value) {

        if ((value[0] === "[" && value[value.length - 1] === "]") || 
            (value[0] === "{" && value[value.length - 1] === "}")) {
            return JSON.parse(value);
        }else{
            return isNaN(value) ? value : parseFloat(value);
        }

    }

    function getMaster( callback ) {

        majaX({
            url: '/data',
            type: 'json',
            method: 'GET',
            data: {}
        }, function (json) {

            currentQueryCount = json.queryCount;

            _.each(json.data, function (node, id) {
                    _.each(node, function (value, name) {
                        node[name] = decode(value);
                    });
                });

            mediator.data = json.data;
            
            callback();

        });

    }

    function update( nodeID , properties) {

        var string;

        if (properties[0] == "remove") {

            string = nodeID + "\tremove";

        } else {

            string = nodeID + "\t" + 
                _.chain(properties)
                    .map(function (propertyName) {
                        return [propertyName, encode(mediator.data[nodeID][propertyName])]
                    })
                    .flatten()
                    .value()
                    .join("\t");
        }

        majaX({
            url: '/pollChange',
            method: 'POST',
            data: {
                'q': string
            }
        }, function (response) {

            lastQueryCount = parseInt(response,10);

            // If my query was the last query, there's no need to receive
            // that update so increase currentQueryCount. However if there
            // is more, then don't increase it because we haven't applied
            // those queries yet

            if (currentQueryCount == lastQueryCount - 1){
                currentQueryCount = lastQueryCount;
            }

            
        });

    }

    function request(){

        majaX({
            url: '/pollUpdate?q=' + currentQueryCount,
            method: 'GET',
        }, function (response) {

            var changes = {};

            var queries = response.split("\n");

            _.each(queries, function (query) {

                // Apply each query

                var parts = query.split("\t");

                if (parts.length < 2){
                    return;
                }

                var nodeID = parts[0];

                if (parts.length  == 2 && parts[1] == "remove") {

                    changes[nodeID] = null;

                    delete mediator.data[nodeID];

                } else {

                    changes[nodeID] = changes[nodeID] || [];

                    var pairs = _.rest(parts);

                    // Create Node if necessary

                    if (!_.has(mediator.data, nodeID)){

                        mediator.data[nodeID] = {};

                    }

                    for (var i = 0;i<pairs.length;i+=2){

                        changes[nodeID].push(pairs[i]);

                        mediator.data[nodeID][pairs[i]] = decode(pairs[i+1]);

                    }
                }

            });

            if (queries[0].length > 3){
                currentQueryCount += queries.length;
            }

            if (!mediator.pendingChanges) {

                mediator.pendingChanges = changes;

            } else {

                changes = _.extend(mediator.pendingChanges,changes);

                _.each(mediator.pendingChanges, function (properties, nodeID) {

                    if (changes[nodeID]) {
                        meditator.pendingChanges[nodeID] = _.union(properties, changes[nodeID]);
                    }

                });

            }
            
        });

    }

    return {

        getMaster : getMaster,
        update : update,
        request : request

    };

}());