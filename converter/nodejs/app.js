var fs = require('fs'),
    util = require('util'),
    mime = require('mime'),
    path = require('path'),
    ffmpeg = require('fluent-ffmpeg'),
    mkdirp = require('mkdirp');

/*
 *    Possible argument positions
 *
 *    converter pathVideo(string) pathVideoFrame(string) startVideoTime(number) endVideoTime(number)
 *    converter pathVideo(string) pathVideoFrame(string) startVideoTime(number)
 *    converter pathVideo(string) pathVideoFrame(string)
 *
 */

if(process.argv.length > 3) {
    var pathVideo = process.argv[2],
        pathVideoFrame = process.argv[3],
        startVideoTime = parseInt(process.argv[4]),
        endVideoTime = parseInt(process.argv[5]),
        tempDirName = path.resolve('/tmp/', '.images'),
        delimiterChar = '|';

    Promise.resolve().then(function(){
        createOrCleanTempDir(tempDirName);
    }).
    then(function(){
        return createVideoFrames(pathVideo, startVideoTime, endVideoTime, tempDirName);
    }).
    then(function(){
        saveVideoFrame(pathVideoFrame, generateStringVideoFrames(tempDirName, delimiterChar));
    }).
    catch(function(err){
        console.log('Error -', err);
    })
} else {
    console.error('Not enough parameters supplied!');
}

function createOrCleanTempDir(tempDirName){
    mkdirp(tempDirName, function(err){
        fs.readdirSync(tempDirName).map(function(elem, index){
            fs.unlinkSync(path.resolve(tempDirName, elem));
        });
    })
}

function createVideoFrames(_path, startTime, endTime, tempDirName){
    return promise = new Promise(function(resolve, reject){
        var command = ffmpeg(path.resolve(_path))
        .noAudio()
        .on('end', function(){
            resolve();
        })
        .on('error', function(err){
            reject(err);
        })

        if (startTime){
            command = command.seekInput(startTime);
        }
        if (endTime){
            if (startTime > endTime){
                reject('Start time must be lower than end time')
            }
            command = command.duration(endTime - startTime);
        }

        command.save(path.resolve(tempDirName, 'image-%07d.jpg'));
    });
}

function generateStringVideoFrames(tempDirName, delimiterChar){
    var fileList = fs.readdirSync(tempDirName).sort();

    if (fileList.length == 0){
        throw new Error('Directory with frames is empty');
    }
    var base64Mime = util.format('data:%s;base64', mime.lookup(path.resolve(tempDirName, fileList[0])));
    var base64Files = fileList.map(function(elem, index){
        return base64Img(path.resolve(tempDirName, elem));
    })

    return fileList.length + delimiterChar + base64Mime + delimiterChar + base64Files.join(delimiterChar) + delimiterChar;
}

function base64Img(src) {
    return fs.readFileSync(src).toString('base64');
}

function saveVideoFrame(_path, data){
    fs.writeFileSync(_path, data);
}
