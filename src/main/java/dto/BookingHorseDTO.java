package dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import entity.BookingHorseId;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingHorseDTO implements Serializable {
    private BookingHorseId id;
    private Integer bookingID;
    private Integer horseID;
    private Instant addedDate;
}
