import json

# Load Data from File and convert to json
# The data field is an associative array with the keys as node ID and content node data
#TODO oldData should be disposed of so it's not using space during the program
oldData = json.loads(open("data.json", 'r').read())
nodeMap = oldData["data"]
initialQueryCount = oldData["queryCount"]
queryList = []

# Convert string to number if it converts, otherwise leave as string
def siftNum(string):
    # Converts number to float if it is a number
    try:
        return float(string)
    except ValueError:
        return string

def getData():
    return json.dumps({
        "queryCount": initialQueryCount + len(queryList),
        "data": nodeMap
    })

def query(queryString):
    global initialQueryCount

    q = queryString.decode().split("\t")

    # [ id , property name , new value , property name... ]
    # TODO permission checking

    nodeID = q[0]

    if len(q) == 2 and q[1] == "remove":
        del nodeMap[nodeID]
        queryList.append(queryString)
        return

    # Create node
    if nodeID not in nodeMap:
        nodeMap[nodeID] = {}
     
    #Change Existing Node
    propertyQueries = [(q[i], q[i+1]) for i in range(1, len(q), 2)]
    for pair in propertyQueries:
        nodeMap[nodeID][pair[0]] = siftNum(pair[1])
    queryList.append(queryString)
    
    #TODO possible inefficieny in counting length every request
    return str(len(queryList))

def history(fromQueryCount):
    #TODO condition where the client requests a portion of history not in memory
    return "\n".join(queryList[fromQueryCount - initialQueryCount:])


def saveData():
    open('data.json', 'w').write(json.dumps(nodeMap, indent=4))
#   open('history.tsv','a').write("\n".join(queryList))

