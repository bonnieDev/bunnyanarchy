const webpack = require('webpack');
webpack({mode:'production',entry:require('path').join(__dirname,'game.js'),output:{path:__dirname,filename:'game.bundle.js'},performance:{hints:false}},(err,stats)=>{
  if(err||stats.hasErrors()){console.error(err||stats.toString({all:false,errors:true}));process.exitCode=1;}
  else console.log(stats.toString({all:false,assets:true}));
});
