const messageUtility = {
    displaySuccessMessages: messages => {
        if (messages.length === 0) {
            return null
        } else {
            const messageDivs = messages.map((message, index) => (
                <div key={index} className="alert alert-success rounded-0">
                    {message}
                </div>
            ))
            
            return messageDivs
        }
    },

    displayErrorMessages: messages => {
        if (messages.length === 0) {
            return null
        } else {
            const messageDivs = messages.map((message, index) => (
                <div key={index} className="alert alert-danger rounded-0">
                    {message}
                </div>
            ))

            return messageDivs
        }
    },

    setSuccessMessagesTimeout: (messages, setSuccessMessages) => {
        setSuccessMessages(messages)

        const timer = setTimeout(() => {
            setSuccessMessages([])
        }, 2000)

        return () => clearTimeout(timer)
    }
}

export default messageUtility
