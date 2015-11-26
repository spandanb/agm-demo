/*
    This script is made is primarily for the drag and drop 
    orchestration flow
*/
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

