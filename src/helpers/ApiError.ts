class ApiError extends Error {
    errorType:string
constructor(public message: string, public statusCode: number) {
        super(message);
        this.errorType = this.statusCode.toString().startsWith("4") ? "fail" : "error";
    }
}


export default ApiError