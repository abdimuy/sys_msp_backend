import store from "../store"

const processData = () => {
    return new Promise((resolve, reject) => {
        resolve(store.processData())
    })
}

export default {
    processData
}