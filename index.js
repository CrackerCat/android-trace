'use strict';

const co = require('co');
const frida = require('frida');
const load = require('frida-load');
const program = require('commander');
const agent_handler = require('./modules/agentHandler');

/*
PARSE COMMAND LINE OPTIONS
*/
function list(val) {
  return val.split(',');
}

program
  .version('1.0.0')
  .option('-n, --package-name <n>', 'android application package name')
  .option('-F, --filter-class <n>', 'specify filter for classes or package name, e.g. part of the package name or a specific class. Leave empty to hook all loaded classes')
  .option('-f, --filter-method <n>', 'specify filter for methods, e.g. part of the package name or a specific class. Leave empty to hook all loaded classes')
  .option('-E, --exclude-classes <items>', 'comma seperated list of class names to exclude, e.g. -E ClassName1,ClassName2', list, [])
  .option('-e, --exclude-methods <items>', 'comma seperated list of method names to exclude, e.g. -e methodName1,methodName2', list, [])
  .parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}

let filterClass = "";
let filterMethod = "";
if (program.filterClass)
  filterClass = program.filterClass;
if (program.filterMethod)
  filterMethod = program.filterMethod;

//TODO filter by exact class name
const package_name = program.packageName;
const exclude_classes = program.excludeClasses;
const exclude_methods = program.excludeMethods;

/*
PRINT STATE INFORMATION
*/
agent_handler.handler.printStateInformation({ type: 'info', data: 'Package Name: ' + package_name });
agent_handler.handler.printStateInformation({ type: 'info', data: 'Filter: ' + filterClass});
agent_handler.handler.printStateInformation({ type: 'info', data: 'Exclude Classes: ' + exclude_classes});
agent_handler.handler.printStateInformation({ type: 'info', data: 'Exclude Methods: ' + exclude_methods });


/*
INIT AGENT AND AGENTHANDLER
*/
co(function *() {
  const scr = yield load(require.resolve('./agent.js'));
  const device = yield frida.getUsbDevice(2);
  const session = yield device.attach(package_name);
  const script = yield session.createScript(scr);

  /*load agent script and get script exported components*/
  yield script.load();
  const agent_api = yield script.getExports();

  /*set agent handler fields*/
  agent_handler.handler.setAgentApi(agent_api);
  agent_handler.handler.setClassFilter(filterClass);
  /*listen for messages from agent - call agent handler*/
  script.events.listen('message', agent_handler.handler.handleAgentMessage);

  /*set agent fields*/
  yield agent_api.setMethodFilter(filterMethod);
  yield agent_api.setExcludeClassNames(exclude_classes);
  yield agent_api.setExcludeMethodNames(exclude_methods);

  yield agent_api.enumerateClasses()

  /*enumerate classes every fixed interval to discover new loaded classes*/
  setInterval(enumClasses, 30000, agent_api);

  /*display message to indicate that the script has finished loading*/
  agent_handler.handler.printStateInformation({ type: "info", data: "Script loaded" });
})
.catch(err => {
  console.error(err);
});

/*function called by setInterval to enumerate classes every fixed interval*/
function enumClasses(agent_api){
  agent_api.enumerateClasses()
}
