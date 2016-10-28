export default class Monitor {
  reducer = (state = {}, action) => {
    console.log("reducer", state, action)
    return state;
  }
}
