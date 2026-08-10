class Request {
    static async getData(url, data = {}, testData = undefined) {
        if (testData) {
            return {
                result: testData
            };
        }

        return new Promise(function (resolve, reject) {
            $.ajax({
                url: url,
                method: 'post',
                dataType: 'json',
                data: data,
                success: function (data) {
                    let out = {result: []};
                    if (data.result) {
                        data.result.forEach(e => {
                            if ((typeof e !== 'string') || (Request.#filterCommonExtension(e))) {
                                out.result.push(e);
                            }
                        });
                    } else {
                        out = data;
                    }
                    resolve(out)
                },
                error: function (err) {
                    resolve([])
                }
            });
        });
    }

    static #filterCommonExtension(fileName) {
        if (Array.isArray(fileName)){
            return true;
        }
        if (typeof fileName !== 'string'){
            return false;
        }
        let ignore = config.getByName('content_extensions_ignore');
        let ext = fileName.split('.');
        ext = (ext.length == 1) ? '' : ext[ext.length - 1];
        return (
            (!ignore['common'].includes(ext)) 
        );
    }
}