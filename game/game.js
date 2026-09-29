import VoxelRabbit from './VoxelRabbit.js';
import FallingProducts from './FallingProducts.js';
import Reggie, {createReactions} from './reggie/Reggie.js';
import {createGame} from './productGame.js';
import {createMovement} from './playerMovement.js';
import React, {useEffect, useRef, Component} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas, useFrame} from '@react-three/fiber';
const h = React.createElement;
// Visible world is at least 9 wide x 7 tall, centered above the floor so
// Reggie's pen fits along the top edge.
const VIEW = {width: 9, height: 7.4, centerY: 1.4};
class Boundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch() { this.props.fail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Box({position, size, color}) {
  return h('mesh', {position}, h('boxGeometry', {args:size}), h('meshBasicMaterial', {color}));
}
window.BunnyArcade = {
  // hud(stats) fires whenever score / streak / lives / status change.
  mount(node, {input, active, ready, fail, hud = () => {}}) {
    const root = createRoot(node);
    const game = createGame();
    const reactions = createReactions();   // the only link between the game and Reggie
    const report = event => hud({status:game.status, score:game.score, streak:game.streak, lives:game.lives, event});
    const emit = type => { if (type !== 'catch' && type !== 'restart') reactions.emit(type); report(type); };
    function Scene() {
      const movement = useRef(createMovement());
      useEffect(()=>{ready();report('start');},[]);
      return h(React.Fragment,null,
        h('color',{attach:'background',args:['#0b0a0c']}),
        h('ambientLight',{intensity:1.5}),
        h('directionalLight',{position:[-3,5,6],intensity:2.2}),
        h(Reggie,{reactions,active}),
        h(VoxelRabbit,{input,active,movement}),
        h(FallingProducts,{game,rabbit:movement,active,input,emit}),
        h(Box,{position:[0,-1.03,0],size:[8,.05,.8],color:'#ff0055'}),
        h(Box,{position:[-3.8,-.84,0],size:[.12,.3,.5],color:'#ffe84d'}),
        h(Box,{position:[3.8,-.84,0],size:[.12,.3,.5],color:'#ffe84d'})
      );
    }
    root.render(h(Boundary,{fail},h(Canvas,{
      orthographic:true, camera:{position:[0,VIEW.centerY+1,8],zoom:45}, dpr:[1,1.5],
      gl:{antialias:false,alpha:false,powerPreference:'low-power'},
      onCreated:({gl,camera,size})=>{
        camera.lookAt(0,VIEW.centerY,0);fit(camera,size);
        gl.domElement.addEventListener('webglcontextlost',fail,{once:true});
      },
      onPointerMissed:()=>node.closest('[data-panel]').focus(),
      fallback:h('span',null,'WebGL unavailable — use EXIT to return to the shop.')
    },h(ResponsiveCamera),h(Scene))));
    // Console: BunnyArcade.debug.reactions.emit('force:scoot' | 'force:cheer' | 'force:laugh')
    window.BunnyArcade.debug = {game, reactions};
    return ()=>{root.unmount();window.BunnyArcade.debug=null;};
  }
};
function fit(camera,size){
  const zoom=Math.min(size.width/VIEW.width,size.height/VIEW.height);
  if(zoom>0&&camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}
}
function ResponsiveCamera(){
  useFrame(({camera,size})=>fit(camera,size));
  return null;
}
