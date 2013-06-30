import cherrypy
import dataio

class MyServer(object):

    def index(self):
        return "Hello World"

    def reset(self):
        reload(dataio)
        return ""

    def data(self):
        return dataio.getData()

    def pollChange(self, q=None):
        return dataio.query(q)

    def pollUpdate(self, q=None):
        print("Q value",q)
        return (q or "").isdigit() and dataio.history(int(q)) or ""

    def save(self):
        dataio.saveData()
        return "Data Saved"

    index.exposed = True
    data.exposed = True
    pollChange.exposed = True
    pollUpdate.exposed = True
    save.exposed = True
    reset.exposed = True


handler = cherrypy.tools.staticdir.handler(section="/", dir="/home/seve/workspace/zom1/client")
cherrypy.tree.mount(handler, "/static")

cherrypy.quickstart(MyServer())