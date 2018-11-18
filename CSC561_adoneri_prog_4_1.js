/** Anjali Doneria, 200200056, adoneri */
/* GLOBAL CONSTANTS AND VARIABLES */
/* assignment specific globals */
const topWindow = 1; 
const bottomWindow = 0;
const leftWindow = 0;
const rightWindow = 1;
const zWindow = 0; 
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog4/triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "https://ncsucgclass.github.io/prog4/ellipsoids.json"; // ellipsoids file loc
const backgroundImage = "https://ncsucgclass.github.io/prog4/sky.jpg";
var eye = new vec3.fromValues(0.5, 0.5, -0.5); // default eye position in world space
var fixedLight = new vec3.fromValues(-1.0, 3.0, -0.5);
var x, y, z;
var gl = null; // the all powerful gl object. It's all here folks!
var vertexPositionAttrib; // where to put position for vertex shader
var vertexNormalAttrib;
var vertexUVAttrib;
var completeMatrix;
var completeMatrixModified;
var lightColor;
var lightColorExtra;
var eyeColor;
var texture;
var pvmMatrixULoc;
var mMatrixULoc;
var textMode;
var textureMode = 0;
var total = 10;
var alphaVal;

class TriangleSet {
    
    constructor() {
        this.cumulativeCoordArr = [];
        this.cumulativeNormalArr = [];

        this.coordArray = [];
        this.normalArray = [];
        this.uvArray = [];
        this.indicesArray = [];
        
        this.triBufferSize = 0;
        this.textureImage = null;
        
        this.matrixModel = mat4.create();
    }
    
    setParams(normal, coord, index, bufferSize, uv) {
        this.coordArray = coord;
        this.normalArray = normal;
        this.uvArray = uv;
        this.indicesArray = index;
        this.triBufferSize = bufferSize;
        
        for (var i = 0; i < this.coordArray.length; ++i) {
            this.cumulativeCoordArr[i] = this.coordArray[i];
            this.cumulativeNormalArr[i] = this.normalArray[i];
        }
    }

    setAmbientColor(amb) {
        this.ambient = amb;
    }

    setDiffuseColor(diff) {
        this.diffuse = diff;
    }

    setSpecularColor(spec, n = 1) {
        this.specular = spec;
        this.n = n;
    }

    setCenter(center) {
        this.center = center;
    }

    setEyeColor() {
        this.eyeColorSet = mat4.fromValues(eye[0], eye[1], eye[2], 1.0,
                        this.ambient[0], this.ambient[1], this.ambient[2], this.alpha,
                        this.diffuse[0], this.diffuse[1], this.diffuse[2], this.alpha,
                        this.specular[0], this.specular[1], this.specular[2], this.n);
    }
    
    setShape(s) {
        this.shape = s;
    }

    setAlpha(alp) {
        this.alpha = alp;
    }

    setTextureImage(url) {
        var text = gl.createTexture();
        var img = new Image();
        img.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_2D, text);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        });
        if ((new URL(url)).origin !== window.location.origin) {
            img.crossOrigin = "";
        }
        img.src = url;
        this.textureImage = text;
    }
}

// read triangles in
var triangleSet = [];
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");

    if (inputTriangles != String.null) {
        for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
            var coordArray = []; 
            var indicesArray = [];
            var normalArray = [];
            var uvArray = [];

            var triCenter = vec3.fromValues(0.0, 0.0, 0.0);

            for (var whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
                var vertexArray = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vertexArray[0], vertexArray[1], vertexArray[2]);
                normalArray.push(inputTriangles[whichSet].normals[whichSetVert][0], inputTriangles[whichSet].normals[whichSetVert][1], inputTriangles[whichSet].normals[whichSetVert][2]);
                uvArray.push(inputTriangles[whichSet].uvs[whichSetVert][0], inputTriangles[whichSet].uvs[whichSetVert][1]);
                vec3.add(triCenter, triCenter, vec3.fromValues(vertexArray[0], vertexArray[1], vertexArray[2]));
            }
            
            for (var whichSetTri = 0; whichSetTri < inputTriangles[whichSet].triangles.length; whichSetTri++) {
                indicesArray.push(inputTriangles[whichSet].triangles[whichSetTri][0], inputTriangles[whichSet].triangles[whichSetTri][1], inputTriangles[whichSet].triangles[whichSetTri][2]);
            }

            triangleSet.push(new TriangleSet());
            triangleSet[triangleSet.length - 1].setParams(normalArray, coordArray, indicesArray,
                3 * inputTriangles[whichSet].triangles.length, uvArray);
                
            var url = "https://ncsucgclass.github.io/prog4/" + inputTriangles[whichSet].material.texture;
            triangleSet[triangleSet.length - 1].setTextureImage(url);

            vec3.scale(triCenter, triCenter, 1.0 / inputTriangles[whichSet].vertices.length);
            triangleSet[triangleSet.length - 1].setCenter(triCenter);

            var colorSet = inputTriangles[whichSet].material;
            triangleSet[triangleSet.length - 1].setDiffuseColor(vec4.fromValues(1.0 * colorSet.diffuse[0], 1.0 * colorSet.diffuse[1], 1.0 * colorSet.diffuse[2], colorSet.alpha));
            triangleSet[triangleSet.length - 1].setSpecularColor(vec4.fromValues(1.0 * colorSet.specular[0], 1.0 * colorSet.specular[1], 1.0 * colorSet.specular[2], colorSet.alpha), colorSet.n);
            triangleSet[triangleSet.length - 1].setAmbientColor(vec4.fromValues(1.0 * colorSet.ambient[0], 1.0 * colorSet.ambient[1], 1.0 * colorSet.ambient[2], colorSet.alpha));
            
            triangleSet[triangleSet.length - 1].setAlpha(colorSet.alpha);
            triangleSet[triangleSet.length - 1].setEyeColor();
            triangleSet[triangleSet.length - 1].setShape(0);
        } // end for each triangle set
    } // end if triangles found
} // end load triangles

class Ellipsoid extends TriangleSet {
    constructor(center, radius, url) {
        super();
        
        this.radius = radius;
        this.setCenter(center);
        
        //generate ellipsoids
        var count = 0;

        for (var angle = 0; angle <= 180; angle += 15) {
            for (var thAngle = 0; thAngle <= 360; thAngle += 15) {
                var vertex = vec3.fromValues(Math.cos(thAngle * Math.PI / 180.0) * Math.sin(angle * Math.PI / 180.0), Math.sin(thAngle * Math.PI / 180.0) * Math.sin(angle * Math.PI / 180.0), Math.cos(angle * Math.PI / 180.0));
                vec3.multiply(vertex, vertex, this.radius);
                vec3.add(vertex, vertex, this.center);
                this.coordArray.push(vertex[0], vertex[1], vertex[2]);
                var rad0 = this.radius[0]*this.radius[0];
                var rad1 = this.radius[1]*this.radius[1];
                var rad2 = this.radius[2]*this.radius[2];
                var normal = vec3.fromValues((vertex[0] - this.center[0])*2.0 / rad0,
                                            (vertex[1] - this.center[1])*2.0 / rad1,
                                            (vertex[2] - this.center[2])*2.0 / rad2);
                vec3.normalize(normal, normal);
                this.normalArray.push(normal[0], normal[1], normal[2]);

                var numAngle = 1.0 - thAngle / 360.0;
                this.uvArray.push(numAngle, angle / 180.0);

                if (angle != 180 && thAngle != 360) {
                    this.indicesArray.push(count, count + 1, (count + 1) + 360 / 15 + 1);
                    this.indicesArray.push(count, (count + 1) + 360 / 15 + 1, count + 360 / 15 + 1);
                    this.triBufferSize += 6;
                }
                count++;
            }
        }

        for (var i = 0; i < this.coordArray.length; ++i) {
            this.cumulativeCoordArr[i] = this.coordArray[i];
            this.cumulativeNormalArr[i] = this.normalArray[i];
        }

        super.setTextureImage(url);
    }
}

// read ellipsoids in
function loadEllipsoids() {
    var inputEllipsoids = getJSONFile(INPUT_ELLIPSOIDS_URL, "ellipsoids");

    if (inputEllipsoids != String.null) {
        for (var whichSet = 0; whichSet < inputEllipsoids.length; whichSet++) {
            var center = vec3.fromValues(inputEllipsoids[whichSet].x, inputEllipsoids[whichSet].y, inputEllipsoids[whichSet].z);
            var radius = vec3.fromValues(inputEllipsoids[whichSet].a, inputEllipsoids[whichSet].b, inputEllipsoids[whichSet].c);

            var url = "https://ncsucgclass.github.io/prog4/" + inputEllipsoids[whichSet].texture;
            triangleSet.push(new Ellipsoid(center, radius,url));

            var coloret = inputEllipsoids[whichSet];

            triangleSet[triangleSet.length - 1].setDiffuseColor(vec4.fromValues(1.0 * coloret.diffuse[0], 1.0 * coloret.diffuse[1], 1.0 * coloret.diffuse[2], coloret.alpha));
            triangleSet[triangleSet.length - 1].setSpecularColor(vec4.fromValues(1.0 * coloret.specular[0], 1.0 * coloret.specular[1], 1.0 * coloret.specular[2], coloret.alpha), coloret.n);

            triangleSet[triangleSet.length - 1].setAmbientColor(vec4.fromValues(1.0 * coloret.ambient[0], 1.0 * coloret.ambient[1], 1.0 * coloret.ambient[2], coloret.alpha));
            triangleSet[triangleSet.length - 1].setAlpha(coloret.alpha);
            triangleSet[triangleSet.length - 1].setEyeColor();
            triangleSet[triangleSet.length - 1].setShape(1);
        } // end for each ellipsoid
    } // end if ellipsoid found
} // end load ellipsoids


function initializeMatrix() {
    x = vec3.fromValues(-1.0, 0.0, 0.0);
    y = vec3.fromValues(0.0, 1.0, 0.0);
    z = vec3.fromValues(0.0, 0.0, -1.0);
    
    var mat1 = mat4.fromValues(x[0], y[0], z[0], 0.0,
                            x[1], y[1], z[1], 0.0,
                            x[2], y[2], z[2], 0.0,
                            0.0, 0.0, 0.0, 1.0);
    var mat2 = mat4.fromValues(1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 1.0, 0.0,
                            0.0 - eye[0], -eye[1], -eye[2], 1.0);
    mMatrixULoc = mat4.create();
    mat4.multiply(mMatrixULoc, mat1, mat2);

    pvmMatrixULoc = mat4.create();
    mat4.perspective(pvmMatrixULoc, Math.PI / 2.0, 1.0, 0.5, 100);

    completeMatrixModified = mat4.create();
    mat4.multiply(completeMatrixModified, pvmMatrixULoc, mMatrixULoc);

    lightColorExtra = mat4.fromValues(fixedLight[0], fixedLight[1], fixedLight[2], 1.0,
                                        1.0, 1.0, 1.0, 0.0,
                                        1.0, 1.0, 1.0, 0.0,
                                        1.0, 1.0, 1.0, 0.0);
}

// ASSIGNMENT HELPER FUNCTIONS
// get the JSON file from the passed URL
function getJSONFile(url, descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET", url, false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try    
    catch (e) {
        console.log(e);
        return (String.null);
    }
} // end get json file

// set up the webGL environment
function setupWebGL() {
    // background
    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    var cw = imageCanvas.width,
        ch = imageCanvas.height;
    imageContext = imageCanvas.getContext("2d");
    var bkgdImage = new Image();
    bkgdImage.crossOrigin = "Anonymous";
    bkgdImage.src = backgroundImage;
    bkgdImage.onload = function() {
        var iw = bkgdImage.width, ih = bkgdImage.height;
        imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
    }

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try
    catch (e) {
        console.log(e);
    } // end catch
} // end setupWebGL

var pressed = null;
function handleKeyDown(e) {
    if (e.keyCode != 16 && ((e.keyCode >= 65 && e.keyCode <= 90) || e.keyCode == 186)) {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            if (e.shiftKey) pressed = String.fromCharCode(e.keyCode);
            else pressed = String.fromCharCode(e.keyCode + 32);
        } else if (e.keyCode == 186) {
            if (e.shiftKey) pressed = 58;
            else pressed = 59;
        }
    } else if ((e.keyCode >= 48 && e.keyCode <= 57)) {
        pressed = String.fromCharCode(e.keyCode);
    } else pressed = e.keyCode;
}

// setup the webGL shaders
function setupShaders() {
    var fShaderCode = `
        varying highp vec3 vertex;
        varying highp vec3 normal;
        
        varying highp vec2 uv;
    
        uniform highp mat4 uLight;
        uniform highp mat4 uEye;
        uniform highp sampler2D uTexture;
        uniform highp int uTextMode;
        uniform highp int uAlpha;

        void main(void) {
            highp vec3 l = normalize(vec3(uLight[0]) - vertex);
            highp vec3 e = normalize(vec3(uEye[0]) - vertex);

            highp vec3 h = normalize(e + l);

            highp vec3 temp_normal;
            if(dot(normal, e) < 0.0) 
                temp_normal = -normal;
            else
                temp_normal = normal;

            highp mat4 mat = matrixCompMult(uLight, uEye);

            highp vec3 cf = max(dot(temp_normal, l), 0.0) * vec3(mat[2]) + pow(max(dot(temp_normal, h), 0.0), uEye[3][3]) * vec3(mat[3]) + vec3(mat[1]);
            highp vec4 ct = texture2D(uTexture, uv);

            highp float af = uEye[1][3];
            highp float at = ct[3];

            highp vec4 res;

            if(uTextMode < 3) 
                res = vec4(cf, af);
            else if(uTextMode < 6) 
                res = ct;
            else if(uTextMode < 9) 
                res = vec4(ct[0]*cf[0], ct[1]*cf[1], ct[2]*cf[2], at);
            else if(uTextMode < 12) 
                res = vec4(ct[0]*cf[0], ct[1]*cf[1], ct[2]*cf[2], af*at);

            gl_FragColor = res;
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        varying highp vec3 vertex;
        varying highp vec3 normal;
        varying highp vec2 uv;
    
        attribute highp vec3 vertexPosition;
        attribute highp vec3 vertexNormal;
        attribute highp vec2 vertexUV;

        uniform highp mat4 uFull;

        void main(void) {
            normal = vertexNormal;
            vertex = vertexPosition;
            uv = vertexUV;

            gl_Position = uFull * vec4(vertexPosition, 1.0);
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib);

                vertexNormalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttrib);

                vertexUVAttrib = gl.getAttribLocation(shaderProgram, "vertexUV");
                gl.enableVertexAttribArray(vertexUVAttrib);

                lightColor = gl.getUniformLocation(shaderProgram, "uLight");
                eyeColor = gl.getUniformLocation(shaderProgram, "uEye");

                texture = gl.getUniformLocation(shaderProgram, "uTexture");

                completeMatrix = gl.getUniformLocation(shaderProgram, "uFull");
                
                textMode = gl.getUniformLocation(shaderProgram, "uTextMode");
                alphaVal = gl.getUniformLocation(shaderProgram, "uAlpha");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    catch (e) {
        console.log(e);
    } // end catch
} // end setup shaders

function update() {
    switch (pressed) {
        case null:
            break;        
        case 'b':
            textureMode = (textureMode + 1) % total;
            break;
        default:
            break;
    }
    pressed = null;
    requestAnimationFrame(action);
}

class TriangleModel {
    constructor(ind, ind1, ind2, ind3, a, b, c) {
        this.objectIndex = ind;

        this.i1 = ind1;
        this.i2 = ind2;
        this.i3 = ind3;

        this.key = vec3.dist(eye, vec3.scale(vec3.create(), vec3.add(vec3.create(), a, vec3.add(vec3.create(), b, c)), 1.0 / 3.0));
    }
}

function renderModels() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(completeMatrix, false, completeMatrixModified);
    gl.uniformMatrix4fv(lightColor, false, lightColorExtra);

    gl.uniform1i(texture, 0);
    gl.uniform1i(textMode, textureMode);

    gl.depthMask(true); // use hidden surface removal with zbuffering
    gl.disable(gl.BLEND);

    gl.uniform1i(alphaVal, 3);

    renderAllTriangles();
}

var coordArr = [];
var normalArr = [];
var uvArr = [];
var preSortedTriangles = [];
var triangles = [];
function renderAllTriangles() {
    createTriangleList(coordArr, normalArr, uvArr, preSortedTriangles);
    sortTriangles(triangles, preSortedTriangles);
    
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArr), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);
    
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArr), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvArr), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexUVAttrib, 2, gl.FLOAT, false, 0, 0);

    var completeIndexArray = [];
    var triBufferSize = 0;
    var currentInd = triangles[0].objectIndex;

    for (var i = 0; i <= triangles.length; i++) {
        if (i < triangles.length && triangles[i].objectIndex == currentInd) {
            completeIndexArray.push(triangles[i].i1, triangles[i].i2, triangles[i].i3);
            triBufferSize += 3;
            continue;
        }

        var triangleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(completeIndexArray), gl.STATIC_DRAW);

        if (triangleSet[currentInd].textureImage != null) 
            gl.bindTexture(gl.TEXTURE_2D, triangleSet[currentInd].textureImage);
        
        gl.uniformMatrix4fv(eyeColor, false, triangleSet[currentInd].eyeColorSet);

        gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);

        completeIndexArray = [];
        triBufferSize = 0;
        
        if (i < triangles.length)
            currentInd = triangles[i--].objectIndex;
    }
}

function createTriangleList(coordArr, normalArr, uvArr, preSortedTriangles){
    var pre = 0;

    for (var i = 0; i < triangleSet.length; i++) {
        var tri = triangleSet[i];

        for (var j = 0; j < tri.indicesArray.length; j += 3) {
            var ind1 = tri.indicesArray[j];
            var ind2 = tri.indicesArray[j + 1];
            var ind3 = tri.indicesArray[j + 2];

            var a = vec3.fromValues(tri.coordArray[ind1 * 3], tri.coordArray[ind1 * 3 + 1], tri.coordArray[ind1 * 3 + 2]);
            var b = vec3.fromValues(tri.coordArray[ind2 * 3], tri.coordArray[ind2 * 3 + 1], tri.coordArray[ind2 * 3 + 2]);
            var c = vec3.fromValues(tri.coordArray[ind3 * 3], tri.coordArray[ind3 * 3 + 1], tri.coordArray[ind3 * 3 + 2]);

            preSortedTriangles.push(new TriangleModel(i, pre + ind1, pre + ind2, pre + ind3, a, b, c));
        }

        pre += tri.coordArray.length / 3;

        coordArr.push.apply(coordArr, tri.coordArray);
        normalArr.push.apply(normalArr, tri.normalArray);
        uvArr.push.apply(uvArr, tri.uvArray);
    }
}

function sortTriangles(triangles, preSortedTriangles) {
    var tempTriangles = new Array(preSortedTriangles.length + 1);

    for (var i = tempTriangles.length - 1; i >= 0; i--) 
        tempTriangles[i] = [];

    var minInd = preSortedTriangles[0].key;       
    var maxInd = preSortedTriangles[0].key;      

    //set the global min and max index
    for (var i = 0; i < preSortedTriangles.length; i++) {
        if (preSortedTriangles[i].key < minInd) 
            minInd = preSortedTriangles[i].key;
        if (preSortedTriangles[i].key > maxInd) 
            maxInd = preSortedTriangles[i].key;
    }

    //create buckets and sort
    for (var i = 0; i < preSortedTriangles.length; i++) {
        var num = preSortedTriangles[i].key - minInd;
        var denom = preSortedTriangles.length*(maxInd - minInd);
        tempTriangles[Math.floor(num/denom)].push(preSortedTriangles[i]);
    }

    for (var i = tempTriangles.length - 1; i >= 0; i--) {
        if (tempTriangles[i] != null && tempTriangles[i].length != 0) {
            tempTriangles[i].sort(function(a, b) { return b.key - a.key; });
            triangles.push.apply(triangles, tempTriangles[i]);
        }
    }
}

function main() {
    setupWebGL();
    
    initializeMatrix();

    loadTriangles();
    loadEllipsoids();
    setupShaders();
    
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(action);
} // end main

function action() {
    update();
    renderModels();
}