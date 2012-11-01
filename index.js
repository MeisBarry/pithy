//NodeJS Imports to Make Everything Just Work
var http = require("http"); //HTTP Server
var url = require("url"); // URL Handling
var fs = require('fs'); // Filesystem Access (writing files)
var os = require("os"); //OS lib, used here for detecting which operating system we're using
var util = require("util");
var express = require('express'); //App Framework (similar to web.py abstraction)
var app = express();
var exec = require('child_process').exec,
    child;
var spawn = require('child_process').spawn,
	child;

server = http.createServer(app)
var execSync = require('execSync');

var sharejs = require('share').server;
var options = {db: {type: 'none'}}; 
io = require('socket.io')
io = io.listen(server); //Socket Creations
io.set('log level', 1)
sharejs.attach(app, options);


//Make Dirs if they don't exist
fs.mkdir("code")
fs.mkdir("code_stamped")
fs.mkdir("images")
fs.mkdir("results")

//Basic Settings
settings = {
	//"bad_words" : ["rm ","write","while True:","open "],
	"python_path" : "python",
	'prepend' : fs.readFileSync('static/prepend.txt').toString()
}

//Process Management variables
var timers = []
var processes = {}
var send_list = []
var spawn_list = {}
var intervalers = {}
var results = {}

//Set Static Directories
app.use(express.bodyParser());
app.use("/static", express.static(__dirname + '/static'));
app.use("/images", express.static(__dirname + '/images'));


app.get('/*', function(req, res){

	if (req.params[0] == "") 
	{
		res.redirect("/"+makeid());

	}

	else if(req.params[0].search("shower/") > -1 )
	{
		//console.log("fooo!")
		sindexer = fs.readFileSync('static/shower.html').toString()
		res.send(sindexer)
	}
	else
	{
		indexer = fs.readFileSync('static/index.html').toString()
		res.send(indexer)
	}
  	//console.log(req.params)
});

app.post("*/killer",function(req,res)
	{
		x = req.body;
		page_name = x['page_name'].replace("/","");
		thispid = processes[page_name];
		delete processes[page_name];
		timers[thispid] = false
		if (thispid != undefined)
		{
			console.log("killing "+thispid)
			exec("kill "+thispid,function(stdout,stderr)
			{
			})
		}
	res.json({success:true})	
})

app.post('*/run', function(req, res)
{
	x = req.body
	//console.log(x)
	page_name = x['page_name'].replace("/","")
	script_name = x['script_name']
	prepend = settings.prepend		
	out = ""
	image_list = []
	//io.sockets.emit(page_name,{'out':"waiting for output"}) 
	//Querer to prevent race condition
	send_list.push({'page_name':page_name,'data':{out:"waiting for output"}})
	time = new Date().getTime().toString()
	counter = 0
	data = x['value']
	for (b in settings.bad_words)
	{
		if (data.search(b) > -1)
		{
			out = "Found '"+b+"', this is a BAD WORD"
			res.json({'out':out,'images':image_list})
			break
		}
	}
	temp =""

	full_name = page_name+".py"
	
	try
	{
		temp = fs.readFileSync("code/"+full_name).toString()
	}
	catch (e)
	{
		temp = "dood"
	}

	if (temp != data || temp == "dood")
	{
		
		fs.writeFileSync("code/"+full_name,data);
		fs.writeFileSync("code_stamped/"+page_name+"_"+time,data);
	}
	
	data = prepend+data
	while (data.search("showme()")>-1)
	{
		data = data.replace("showme()","save_image('"+page_name+"_"+time+"')\n",1)
		counter ++;
	}
	
	fs.writeFileSync("code/temper.py",data)
	
	start_time = new Date().getTime()
	res.json({success:true})
	
	spawn_list[page_name] = spawn(settings.python_path,[__dirname+"/code/temper.py"])
	processes[page_name] = spawn_list[page_name].pid
	results[processes[page_name]] = {}
	results[processes[page_name]]['page_name'] = page_name
	results[processes[page_name]]['stdout'] = ""
	results[processes[page_name]]['stderr'] = ""
	results[processes[page_name]]['error'] = ""
	results[processes[page_name]]['start_time'] = start_time
	
	spawn_list[page_name].stdout.on('data',function(data){results[processes[page_name]]['stdout'] += data})
	spawn_list[page_name].stderr.on('data',function(data){results[processes[page_name]]['stderr'] += data})
	spawn_list[page_name].on('error',function(data){results[processes[page_name]]['error'] += data;console.log(data)})
	
	spawn_list[page_name].on('exit',function(code)
	{
		try
		{
		this_pid = this.pid
		
		console.log("exiting "+this_pid+" with code "+code)
		stdout = results[this_pid]['stdout']
		stderr = results[this_pid]['stderr']
		panana = results[this_pid]['page_name']
		console.log(panana)
		end_time = new Date().getTime()
		exec_time= end_time - results[this_pid]['start_time']
		big_out = {'out':stdout,'outerr':stderr,'images':[],'exec_time':exec_time}
		console.log(big_out)
		send_list.push({'page_name':panana,'data':big_out})
		if (stderr.search("Terminated") == -1) fs.writeFileSync("results/"+panana,JSON.stringify(big_out))
		
		//Clean up, clean up, everybody clean up
		delete processes[panana];		
		delete spawn_list[panana];
		delete results[this_pid];		
		}
		catch(e){
			console.log("On Exit")
			console.log(e)
			}
		
	})
	
	
	timers[processes[page_name]] = true
	
});

app.post('*/history', function(req, res)
{
	x = req.body;
	page_name = x['page_name'].replace("/","")
	length = "_1314970891000".length //get length of timestamp
	structure = "code_stamped/"+page_name+"*"
	thing_list = []

	fils  = fs.readdirSync("code_stamped")
	for (i in fils)
	{
		if (fils[i].search(page_name+"_") > -1) 
		{
			thing_list.push(fils[i])
		}
	}
		
	fils = thing_list
	fils.sort()
	fils.reverse()
	hist_list = []
	for (i in fils)
	{
		//time_part = parseInt(fils[i].split("_")[1])
		time_part = parseInt(fils[i].substr(fils[i].length - length+1))
		//console.log(time_part)
		date = new Date(time_part)
		hour = date.getHours()
		min = date.getMinutes()
		sec = date.getSeconds()
		day = date.getDate()
		month = date.getMonth()
		year = date.getYear()
		time_part = month+"/"+day+"/"+year+" "+hour+":"+min+":"+sec;
		hist_list.push([fils[i],date.toISOString()])
	}
		
	res.json({'out':hist_list})
});

app.post('*/read', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out = "Fill Me Up"
	page_name = x['page_name'].replace("/","")
	try{
	try
	{
		out = fs.readFileSync("code/"+page_name+".py").toString()
		
		
	}
	catch (e)
	{
		out = fs.readFileSync("code_stamped/"+page_name).toString()		
	}
	}
	catch (e)
	{
		out = "fill me up"
	}

	back_to_pith['script'] = out
	res.json(back_to_pith)
	
	try
	{
		resulters = fs.readFileSync("results/"+page_name).toString()
		resulters = JSON.parse(resulters)	
		setTimeout(function()
		{
			send_list.push({'page_name':page_name,'data':resulters})
		},1000);
		
	}
	catch (e)
	{	
		console.log(e)
	}
	
});

app.post('*/readresults', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out = "Fill Me Up"
	page_name = x['page_name']
	try
	{
		out = fs.readFileSync("results/"+page_name).toString()		
	}
	catch (e)
	{
		//console.log(e)
		out = "fill me up"
	}
	//console.log(out)
	res.json( JSON.parse(out) )
	
});

//Start It Up!
server.listen(process.argv[2]);
console.log('Listening on port '+process.argv[2]);

//----------Helper Functions----------------------------

//Makes random page
//cribbed from http://stackoverflow.com/a/1349426/565514
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

//Queue to prevent socket race conditions, fires a message from the buffer every 50 ms
//TODO: Figure out how to reduce interval time without 
setInterval(function(){
	this_send = send_list.splice(0,1)[0]
	if (this_send != undefined) 
	{
		
		//console.log(send_list.length + " message(s) in queue")
		io.sockets.emit(this_send['page_name'],this_send['data'])
	};
},500)




//Process Checker
setInterval(function() {
	for (p in processes)
	{

		try{
			outer = execSync.stdout("top -b -n 1 -p "+processes[p]);
			outer += "\n"+results[processes[p]]['stdout'] 
			//Double check to see if process is alive.  If not, don't push!
			if (outer.search(processes[p]) > 1)send_list.push({'page_name':p,'data':{out:outer}})
		}
		catch(e){
			console.log(processes[p]);
			console.log(results)
			console.log(e)
		}
	
	}
}, 2000);


