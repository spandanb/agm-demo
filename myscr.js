function allowDrop(ev){
    ev.preventDefault();
}

function drag(ev){
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev){
    ev.preventDefault();

    //This could be any property specified in the drag function
    var id = ev.dataTransfer.getData("text");
    var el = document.getElementById(id);
    ev.target.appendChild(el.cloneNode(true));
    //The id corresponds to the type
    graph.addNode(null, id);
}


function myGraph(el) {

    // Add and remove elements on the graph object
    this.addNode = function (id, type) {
        //Set defaults if values not specified
        type = type || "server"; 
        //Need a suitable id
        if(!id){
           //Find number of existing nodes
           //The id is the type + count
           var counts =  _.countBy(nodes, function(node){ return node.type});
           id = type + (counts[type] ? counts[type] : '0');
           console.log(type);
        }
        nodes.push({"id": id, "type": type});
        update();
    }

    this.removeNode = function (id) {
        var i = 0;
        var n = findNode(id);
        while (i < links.length) {
            if ((links[i]['source'] === n)||(links[i]['target'] == n)) links.splice(i,1);
            else i++;
        }
        var index = findNodeIndex(id);
        if(index !== undefined) {
            nodes.splice(index, 1);
            update();
        }
    }

    this.addLink = function (sourceId, targetId) {
        var sourceNode = findNode(sourceId);
        var targetNode = findNode(targetId);

        if((sourceNode !== undefined) && (targetNode !== undefined)) {
            links.push({"source": sourceNode, "target": targetNode});
            update();
        }
    }

    var findNode = function (id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return nodes[i]
        };
    }

    var findNodeIndex = function (id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return i
        };
    }

    // set up the D3 visualisation in the specified element
    var vis = this.vis = d3.select("svg");

    var force = d3.layout.force()
        .gravity(.05)
        .distance(100)
        .charge(-100)
        .size(["500", "500"]); //The width, height of svg canvas

    var nodes = force.nodes(),
        links = force.links();

    var update = function () {

        var link = vis.selectAll("line.link")
            .data(links, function(d) { return d.source.id + "-" + d.target.id; });

        link.enter().insert("line")
            .attr("class", "link");

        link.exit().remove();

        var node = vis.selectAll("g.node")
            .data(nodes, function(d) { return d.id;});

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .call(force.drag);

        nodeEnter.append("image")
            .attr("class", "circle")
            .attr("xlink:href", function(d){ return "icons/" + d.type + ".png"})
            .attr("x", "-8px")
            .attr("y", "-8px")
            .attr("width", "32px")
            .attr("height", "32px");

        nodeEnter.append("text")
            .attr("class", "nodetext")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {return d.id});

        node.exit().remove();

        force.on("tick", function() {
          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

          node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

        // Restart the force layout.
        force.start();
    }

    // Make it all go
    update();
}


//Initialize graph object
var graph = new myGraph("#graph");

//graph.addNode("A");
//graph.addNode("B");
//graph.addLink("A", "B");
//  
//graph.addNode("C");
//graph.addNode("D");
//graph.addLink("C", "D");    

//Create a new node
$("#add-node").click(
    function(){
        var name = $("#add-node-name").val()
        graph.addNode(name);
    }
);

$("#link-node").click(
    function(){
        var name1 = $("#link-node-name1").val()
        var name2 = $("#link-node-name2").val()
        graph.addLink(name1, name2);
    }
);

$("#remove-node").click(
    function(){
        var name = $("#remove-node-name").val()
        graph.removeNode(name);
    }
);

