import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'



const connectDB = async () => {
    try {
        const connect = await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`)
        if(connect) console.log(`${connect.connection.host}`)
    } catch (error) {
        console.log('Error in db connect', error)
        process.exit(1)
    }
}

export default connectDB