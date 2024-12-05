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
                    resolve(data)
                },
                error: function (err) {
                    resolve([])
                }
            });
        });
    }
}