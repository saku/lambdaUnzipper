var aws = require('aws-sdk');
var s3 = new aws.S3();
var mime = require('mime-types');
var async = require('async');
var JSZip = require('jszip');

var unzipBucket = 'design-template-html';

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    s3.getObject({Bucket:bucket, Key:key},
        function(err,data) {
            if (err) {
                console.log("Error getting object " + key + " from bucket " + bucket +
                    ". Make sure they exist and your bucket is in the same region as this function.");
                context.fail('Error', "Error getting file: " + err);
                return;
            }

            if (data.ContentType != 'application/zip') {
                console.log('not zip!:' + data.ContentType);
                context.succeed();
                return;
            }

            console.log('yeah!! zip!');
            var zip = new JSZip(data.Body);

            async.forEach(zip.files, function (zippedFile) {
                var f = zippedFile;
                console.log("filename:" + f.name);
                var mimetype = mime.lookup(f.name);

                if (mimetype == false) {
                    mimetype = 'application/octet-stream';
                }
                console.log("mimetype:" + mimetype);

                s3.putObject({
                        Bucket: unzipBucket,
                        Key: f.name,
                        Body: new Buffer(f.asBinary(), "binary"),
                        ContentType: mimetype,
                        CacheControl: 'no-cache',
                        Expires: 0
                    }, function(err, data) {
                        if (err) {
                            context.fail(err, "unzip error");
                        }
                        console.log("success to unzip:" + f.name);
                    }
                );
            }, function (err) {
                if (err) {
                    context.fail(err, "async forEach error");
                }
                console.log('all finish!');
                context.succeed();
            });
        }
    );
};
