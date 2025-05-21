const messageUtility = {
    displaySuccessMessages: messages => {
        if (messages.length === 0) return null
        const messageDivs = messages.map((message, index) => (
            <div key={index} className="alert alert-success rounded-0">
                {message}
            </div>
        ))
        return messageDivs
    },

    displayErrorMessages: (messages, resolutionLink = null) => {
        if (messages.length === 0) return null
        let divider = null
        if (resolutionLink) divider = ' — '
        const messageDivs = messages.map((message, index) => (
            <div key={index} className="alert alert-danger rounded-0">
                {message}{divider}{resolutionLink}
            </div>
        ))
        return messageDivs
    },

    setMessagesWithTimeout: (messages, setMessages) => {
        setMessages(messages)
        const timer = setTimeout(() => setMessages([]), 2000)
        return () => clearTimeout(timer)
    }
}

export default messageUtility
