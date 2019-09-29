const storage = require("azure-storage");
const fs = require('fs');
const stream = require('stream');
var base64 = require('base64-stream');

/**
 * Helps with the use of several blobService-functions
 * 
 * We use them for the display of containers, available blobs and when downloading 
 * blobs from the storage. 
 * 
 */
class AzureStorageHelper {
    constructor () {
        this.blobService = storage.createBlobService();
    }

    /*
        List every available container in the connected storage
    */
    listContainers () {
        return new Promise(async (resolve, reject) => {
            this.blobService.listContainersSegmented(null, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.result = data.entries);

                    console.log("Show me 1.5");
                }
            });
        });
    };

    /**
     * Show us every blob in our container 
     * @param {*} containerName 
     */
    listBlobs (containerName) {
        return new Promise((resolve, reject) => {
            this.blobService.listBlobsSegmented(containerName, null, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        message: `${data.entries.length} blobs in '${containerName}'`,
                        blobs: data.entries
                    });
                }
            });
        });
    };

    /**
     * Read a blobfile in the azure storage and return the text 
     * @param {*} containerName 
     * @param {*} blobName 
     */
    async downloadDocumentAsText (containerName, blobName) {
        return new Promise((resolve, reject) => {
            this.blobService.getBlobToText(containerName, blobName, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        message: `Blob downloaded "${data}"`,
                        text: data
                    });
                }
            });
        });
    };

    /**
     * Download files from the azure storage and works with a stream.
     * This function is used to stream pdf files directly to the user.
     * 
     * This offers us to completely hide the source of our files and works with the official azure service.
     * We can therefore send the file, without exposing the url.
     * 
     * Afterwards, it will create a json which contains the data needed for the communication with the user.
     * @param {*} containerName 
     * @param {*} blobName 
     */
    downloadContent (containerName, blobName) {
        // get the stream, that reads the blob content from azure
        var blobStream = this.blobService.createReadStream(containerName, blobName, (err, res) => {
            if (!err) {
                console.log("createReadStream() successfully");
            }
        }).pipe(new base64.Base64Encode()); // we need to encode it into base64 to avoid problems, if we won't save it temporarely 
        
        // we want to work with async / await, so we need to return a Promise
        var myPromise = new Promise(function(resolve, reject) {
            
            blobStream.on("data", async data => {
                // after everything is downloaded, create the json with our content
                resolve(  
                {
                    name: blobName,
                    contentType: 'application/pdf',
                    contentUrl: `data:application/pdf;base64,${ data }` // base64?
                    // contentUrl: `data:application/pdf;base64,${ data }` // base64?
                })
            });
        });

        return myPromise;
    }

    /**
     * Return the Attachment, based on the given input.
     * @param {*} container 
     * @param {*} blob 
     */
    async getAttachment (container, blob) {
        var result = await this.downloadContent(container, blob);
        return result;
    }    
}

module.exports.AzureStorageHelper = AzureStorageHelper;
